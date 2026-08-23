import { getSupabaseAdmin } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUserId(value: string): boolean {
  return UUID.test(value);
}

/**
 * 익명 계정에 모아 둔 것을 구글 계정으로 옮긴다.
 *
 * linkIdentity 가 identity_already_exists 로 실패한 뒤, 그 구글 계정으로
 * 다시 로그인하면 id 가 바뀐다. 옮기지 않으면 방금 기기에 있던 하트·그룹이 잠긴다.
 * service_role 이 필요해서 콜백 라우트에서만 부른다.
 */
export async function mergeAnonymousInto(fromId: string, toId: string): Promise<void> {
  if (fromId === toId || !isUserId(fromId) || !isUserId(toId)) return;

  const admin = getSupabaseAdmin();

  const [placesRes, listsRes, membersRes, subsRes] = await Promise.all([
    admin.from("saved_places").select("place_id, visibility, saved_at").eq("user_id", fromId),
    admin.from("saved_lists").select("id, name, position, visibility").eq("user_id", fromId),
    admin.from("saved_list_places").select("list_id, place_id, added_at").eq("user_id", fromId),
    admin.from("subscriptions").select("creator_id, created_at").eq("user_id", fromId),
  ]);

  /* 읽기 실패를 `?? []` 로 삼키면 그 종류만 안 옮긴 채 아래 deleteUser 까지 도달하고,
     cascade 가 원본을 지워 복구 수단이 사라진다. 쓰기와 같이 즉시 throw 해서
     병합을 통째로 중단한다 — 중단하면 삭제에 닿지 않으므로 원본이 남는다. */
  for (const res of [placesRes, listsRes, membersRes, subsRes]) {
    if (res.error) throw res.error;
  }

  const places = placesRes.data ?? [];
  if (places.length > 0) {
    const { error } = await admin.from("saved_places").upsert(
      places.map((p) => ({
        user_id: toId,
        place_id: p.place_id,
        visibility: p.visibility,
        saved_at: p.saved_at,
      })),
      { onConflict: "user_id,place_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  const oldLists = listsRes.data ?? [];
  const { data: existingLists, error: existingErr } = await admin
    .from("saved_lists")
    .select("id, name")
    .eq("user_id", toId);
  if (existingErr) throw existingErr;

  const byName = new Map((existingLists ?? []).map((l) => [l.name.trim().toLowerCase(), l.id]));
  const listMap = new Map<string, string>();

  for (const list of oldLists) {
    const key = list.name.trim().toLowerCase();
    const already = byName.get(key);
    if (already) {
      listMap.set(list.id, already);
      continue;
    }
    const { data: created, error } = await admin
      .from("saved_lists")
      .insert({ user_id: toId, name: list.name, position: list.position, visibility: list.visibility })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("list insert failed");
    listMap.set(list.id, created.id);
    byName.set(key, created.id);
  }

  const members = membersRes.data ?? [];
  if (members.length > 0) {
    const rows = members.flatMap((m) => {
      const listId = listMap.get(m.list_id);
      if (!listId) return [];
      return [{ list_id: listId, place_id: m.place_id, user_id: toId, added_at: m.added_at }];
    });
    if (rows.length > 0) {
      const { error } = await admin
        .from("saved_list_places")
        .upsert(rows, { onConflict: "list_id,place_id", ignoreDuplicates: true });
      if (error) throw error;
    }
  }

  const subs = subsRes.data ?? [];
  if (subs.length > 0) {
    const { error } = await admin.from("subscriptions").upsert(
      subs.map((s) => ({ user_id: toId, creator_id: s.creator_id, created_at: s.created_at })),
      { onConflict: "user_id,creator_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  /* 옮긴 뒤 익명 유저를 지운다. cascade 가 남은 원본 행을 정리한다. */
  const { error: delErr } = await admin.auth.admin.deleteUser(fromId);
  if (delErr) throw delErr;
}
