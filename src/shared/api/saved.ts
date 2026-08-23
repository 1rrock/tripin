"use client";

/**
 * 저장 · 갔던 곳 · 채널 구독의 쓰기 경로.
 *
 * 원칙 하나가 이 파일 전체를 지배한다:
 * **읽기는 세션을 만들지 않고, 쓰기만 세션을 만든다.**
 *
 * 페이지를 열었다고 익명 계정이 생기면 검색으로 들어와 한 번 보고 나가는 사람마다
 * auth.users row 가 하나씩 쌓인다. 그건 MAU 를 태우고(무료 한도 50,000) 봇 어뷰징의
 * 표적이 된다. 그래서 `loadSaved` 는 세션이 **이미 있을 때만** 질의하고,
 * `ensureSession()` 은 하트를 실제로 누르는 순간에만 불린다.
 */

import { supabaseBrowser, ensureSession, resetSession } from "./supabase-browser";

/**
 * 세션이 죽은 채로 쓰기를 시도하면 DB 가 이 코드로 걷어찬다
 * ("Key is not present in table users"). 확인 캐시를 버리고 한 번 재시도한다.
 */
const PG_FK_VIOLATION = "23503";

/**
 * 쓰기를 감싼다 — 유저가 사라졌으면 새 익명 세션으로 **한 번만** 다시 해본다.
 *
 * 재시도를 한 번으로 묶는 이유: 두 번째도 23503 이면 원인이 세션이 아니다
 * (장소가 지워졌다든가). 무한히 세션을 새로 만들면 auth.users 만 쌓인다.
 */
async function withSession<T>(
  run: (uid: string) => Promise<{ error: { code?: string } | null; value?: T }>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const uid = await ensureSession();
    if (!uid) return false;

    const { error } = await run(uid);
    if (!error) return true;
    if (error.code !== PG_FK_VIOLATION || attempt === 1) return false;

    /* 이 세션이 가리키는 유저가 서버에 없다 — 캐시를 버리면 다음 회차가 새로 만든다 */
    resetSession();
    await supabaseBrowser().auth.signOut({ scope: "local" });
  }
  return false;
}

export type ListMeta = { id: string; name: string; position: number };

export type SavedSnapshot = {
  /** 저장한 장소 id */
  places: Set<string>;
  /** 구독한 채널 id */
  creators: Set<string>;
  /** 그룹 목록 — 표시 순서대로 */
  lists: ListMeta[];
  /** 장소 id → 그 장소가 속한 그룹 id 들 */
  membership: Map<string, Set<string>>;
};

export const EMPTY_SNAPSHOT: SavedSnapshot = {
  places: new Set(),
  creators: new Set(),
  lists: [],
  membership: new Map(),
};

/** 이름 중복 유니크 인덱스(saved_lists_user_name_idx)에 걸렸을 때의 PG 코드. */
const PG_UNIQUE_VIOLATION = "23505";

export type ListResult = { ok: true; id: string } | { ok: false; reason: "duplicate" | "failed" };

/**
 * 현재 유저의 저장 상태를 한 번에 읽는다.
 *
 * 버튼마다 각자 조회하게 두면 장소 20개 목록에서 요청이 20번 난다.
 * 그래서 이 함수 하나가 전부 읽고 `SavedProvider` 가 나눠준다.
 *
 * 세션이 없으면 **네트워크를 타지 않고** 빈 스냅샷을 준다.
 */
export async function loadSaved(): Promise<SavedSnapshot> {
  const sb = supabaseBrowser();

  const { data: session } = await sb.auth.getSession();
  if (!session.session) return EMPTY_SNAPSHOT;

  const [saves, subs, lists, members] = await Promise.all([
    sb.from("saved_places").select("place_id"),
    sb.from("subscriptions").select("creator_id"),
    sb
      .from("saved_lists")
      .select("id, name, position")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    sb.from("saved_list_places").select("list_id, place_id"),
  ]);

  const snapshot: SavedSnapshot = {
    places: new Set(),
    creators: new Set(),
    lists: [],
    membership: new Map(),
  };

  for (const row of saves.data ?? []) {
    if (!row.place_id) continue;
    snapshot.places.add(row.place_id);
  }
  for (const row of subs.data ?? []) {
    if (row.creator_id) snapshot.creators.add(row.creator_id);
  }
  for (const row of lists.data ?? []) {
    if (row.id && row.name) {
      snapshot.lists.push({ id: row.id, name: row.name, position: row.position ?? 0 });
    }
  }
  for (const row of members.data ?? []) {
    if (!row.place_id || !row.list_id) continue;
    const set = snapshot.membership.get(row.place_id) ?? new Set<string>();
    set.add(row.list_id);
    snapshot.membership.set(row.place_id, set);
  }
  return snapshot;
}

/* ── 그룹 ─────────────────────────────────────────────── */

/**
 * 그룹을 만든다.
 *
 * 이름 중복은 DB 유니크 인덱스가 막는다(대소문자·앞뒤 공백 무시).
 * 앱에서 미리 검사하지 않고 에러 코드로 가르는 이유: 두 탭에서 동시에 만들면
 * 앱 검사는 통과하고 DB 에서만 걸린다. 어차피 여기서 처리해야 한다.
 */
export async function createList(name: string): Promise<ListResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) return { ok: false, reason: "failed" };

  /* 쓰기 경로라 setSaved 와 같은 자가 회복이 필요하다. 반환 타입이 boolean 이
     아니라 withSession 을 못 쓰고 같은 모양을 손으로 편다. */
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const uid = await ensureSession();
    if (!uid) return { ok: false, reason: "failed" };

    const { data, error } = await supabaseBrowser()
      .from("saved_lists")
      .insert({ user_id: uid, name: trimmed })
      .select("id")
      .single();

    if (!error) return { ok: true, id: data.id };
    if (error.code === PG_UNIQUE_VIOLATION) return { ok: false, reason: "duplicate" };
    if (error.code !== PG_FK_VIOLATION || attempt === 1) return { ok: false, reason: "failed" };

    resetSession();
    await supabaseBrowser().auth.signOut({ scope: "local" });
  }
  return { ok: false, reason: "failed" };
}

/**
 * 그룹 이름을 바꾼다.
 *
 * ⚠️ `.select()` 로 **영향 행을 되받는 것이 핵심이다.** PostgREST 는 0행 매칭을
 *    에러로 주지 않는다 — 세션이 만료됐거나 남의 그룹을 가리켜 RLS 에 막혀도
 *    `error` 는 null 이다. 그것만 보고 성공이라 답하면 화면은 바뀐 이름을 보여주고
 *    새로고침하면 옛 이름이 돌아온다. 다른 쓰기처럼 `ensureSession()` 도 태운다.
 */
export async function renameList(listId: string, name: string): Promise<ListResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) return { ok: false, reason: "failed" };

  const uid = await ensureSession();
  if (!uid) return { ok: false, reason: "failed" };

  const { data, error } = await supabaseBrowser()
    .from("saved_lists")
    .update({ name: trimmed })
    .eq("id", listId)
    .select("id");
  if (error) {
    return { ok: false, reason: error.code === PG_UNIQUE_VIOLATION ? "duplicate" : "failed" };
  }
  if (!data?.length) return { ok: false, reason: "failed" };
  return { ok: true, id: listId };
}

/**
 * 그룹을 지운다.
 *
 * 안에 있던 장소는 **저장 목록에 그대로 남는다** — saved_list_places 만 cascade 로
 * 지워지고 saved_places 는 건드리지 않는다. 그룹은 분류일 뿐이라 분류를 없앤다고
 * 모아둔 곳이 사라지면 안 된다.
 *
 * renameList 와 같은 이유로 `.select()` 로 영향 행을 확인한다 — RLS 에 막힌 삭제도
 * 에러 없이 0행으로 돌아온다.
 */
export async function deleteList(listId: string): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;

  const { data, error } = await supabaseBrowser()
    .from("saved_lists")
    .delete()
    .eq("id", listId)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/**
 * 장소를 그룹에 넣거나 뺀다.
 *
 * 넣을 때 saved_places 에도 같이 넣는다 — 그룹에는 있는데 저장 목록에는 없는
 * 상태를 만들지 않는다. 뺄 때는 저장을 유지한다(분류만 푸는 것이다).
 */
export async function setInList(
  listId: string,
  placeId: string,
  next: boolean,
): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;
  const sb = supabaseBrowser();

  if (!next) {
    /* `.select()` 로 영향 행을 확인한다 — RLS 에 막힌 삭제는 에러가 아니라 0행이다.
       0행을 성공이라 답하면 체크가 풀린 채로 보이다가 새로고침에 되돌아온다. */
    const { data, error } = await sb
      .from("saved_list_places")
      .delete()
      .eq("list_id", listId)
      .eq("place_id", placeId)
      .select("place_id");
    return !error && (data?.length ?? 0) > 0;
  }

  const saved = await setSaved(placeId, true);
  if (!saved) return false;

  return withSession(async (verified) =>
    supabaseBrowser()
      .from("saved_list_places")
      .upsert(
        { list_id: listId, place_id: placeId, user_id: verified },
        { onConflict: "list_id,place_id" },
      ),
  );
}

/** 저장 토글. 성공하면 true. 익명 세션 생성이 막혀 있으면 false. */
export async function setSaved(placeId: string, next: boolean): Promise<boolean> {
  if (!next) {
    const sb = supabaseBrowser();
    /* 하트를 끄면 분류도 같이 지운다. saved_list_places 는 saved_places 와
       FK 가 없어서, 여기 안 지우면 다시 하트를 켤 때 옛 그룹이 유령처럼 돌아온다. */
    const { error: memErr } = await sb.from("saved_list_places").delete().eq("place_id", placeId);
    if (memErr) return false;
    const { error } = await sb.from("saved_places").delete().eq("place_id", placeId);
    return !error;
  }

  /* upsert 를 쓰는 이유: 저장을 껐다 켜는 사이에 다른 탭에서 이미 저장했으면
     insert 가 PK 충돌로 실패한다. 유저 입장에선 "하트를 눌렀는데 안 켜짐"이다. */
  return withSession(async (uid) =>
    supabaseBrowser()
      .from("saved_places")
      .upsert({ user_id: uid, place_id: placeId }, { onConflict: "user_id,place_id" }),
  );
}

/** 채널 구독 토글. */
export async function setSubscribed(creatorId: string, next: boolean): Promise<boolean> {
  if (!next) {
    const sb = supabaseBrowser();
    const { error } = await sb.from("subscriptions").delete().eq("creator_id", creatorId);
    return !error;
  }
  return withSession(async (uid) =>
    supabaseBrowser()
      .from("subscriptions")
      .upsert({ user_id: uid, creator_id: creatorId }, { onConflict: "user_id,creator_id" }),
  );
}

/**
 * 익명 계정을 구글 계정으로 **승격**한다.
 *
 * ⚠️ signInWithOAuth 는 익명 세션을 새 세션으로 갈아치우지 않는다 —
 *    linkIdentity 가 같은 auth.users.id 에 구글 신원을 붙인다. id 가 유지되므로
 *    saved_places·subscriptions 를 손대지 않아도 그대로 따라온다.
 *    signInWithOAuth 를 쓰면 **새 유저가 생기고 모아둔 것이 전부 사라진다.**
 *
 * @param backTo 연결이 끝난 뒤 돌아올 **사이트 안 경로**(`/saved`, `/en/account` …).
 *   전체 URL 이 아니다 — 구글은 `/auth/callback` 으로 보내고, 거기서 여기로 다시 민다.
 */
export async function linkGoogle(backTo: string): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data: session } = await sb.auth.getSession();

  /* 구글 → Supabase → **우리 콜백 라우트** → backTo.
     화면 URL 을 그대로 redirectTo 로 주면 코드 교환이 하이드레이션 뒤로 밀려서
     돌아온 첫 렌더가 옛 세션을 본다(`app/auth/callback/route.ts` 주석). */
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(backTo)}`;
  const oauth = { redirectTo, scopes: "email profile openid" };

  if (session.session) {
    const { error } = await sb.auth.linkIdentity({
      provider: "google",
      options: oauth,
    });
    return error ? error.message : null;
  }

  /* 저장한 것이 없는 상태에서 로그인부터 하는 경우 — 승계할 게 없으니 평범한 로그인 */
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: oauth,
  });
  return error ? error.message : null;
}

/**
 * 로그아웃.
 *
 * scope 를 'local' 로 둔다 — 기본값 'global' 은 **그 유저가 로그인한 모든 기기**를
 * 끊는다. 집 컴퓨터에서 로그아웃했다고 폰의 저장 목록이 잠기면 안 된다.
 *
 * `resetSession()` 을 같이 부르지 않으면 확인 캐시(`verifiedUid`)가 남아서
 * 다음 하트가 이미 없는 유저로 쓰기를 시도한다.
 */
export async function signOut(): Promise<boolean> {
  const { error } = await supabaseBrowser().auth.signOut({ scope: "local" });
  resetSession();
  return !error;
}

/**
 * 탈퇴 — auth.users row 를 지운다. 저장·그룹·구독은 FK cascade 로 같이 사라진다.
 *
 * 클라이언트에서 직접 못 한다. anon 키에는 유저 삭제 권한이 없고, RLS 로 열어줄
 * 수도 없다(auth 스키마다). service_role 키가 필요하고 그건 서버에만 있다
 * (`shared/config/env.ts:82`). 그래서 라우트 핸들러를 한 번 경유한다.
 */
export async function deleteAccount(): Promise<boolean> {
  const res = await fetch("/api/account/delete", { method: "POST" });
  if (!res.ok) return false;
  /* 서버가 유저를 지웠으므로 남은 쿠키는 죽은 토큰이다. 지우지 않으면
     다음 쓰기가 23503 을 맞고 나서야 회복한다. */
  await supabaseBrowser().auth.signOut({ scope: "local" });
  resetSession();
  return true;
}
