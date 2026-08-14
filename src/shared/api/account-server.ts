import { cache } from "react";
import { supabase } from "./supabase";
import { supabaseServer } from "./supabase-server";

/**
 * 마이페이지가 필요로 하는 것 전부를 한 번에 읽는다.
 *
 * `saved-server.ts` 와 나란한 파일이고 같은 규율을 따른다:
 * **유저별 데이터는 `shared/api/cache.ts` 를 태우지 않는다.** 태우면 남의 계정이 섞인다.
 * 대신 `react.cache` 로 감싸 한 요청 안에서만 재사용한다.
 *
 * 질의를 둘로 가르는 것도 같은 이유다 —
 *   1) subscriptions  세션 클라이언트로. RLS 가 자기 것만 준다.
 *   2) creators       공개 클라이언트로. 이미 공개된 데이터라 조인이 필요 없다.
 */

export interface SubscribedCreator {
  id: string;
  slug: string;
  displayName: string;
  initials: string;
  accent: string;
  avatarUrl: string | null;
  handle: string | null;
}

export interface AccountView {
  /** 세션이 아예 없으면 null — 저장도 구독도 한 적이 없는 사람이다. */
  userId: string | null;
  /** 익명이 아니라 실제 신원(구글 등)이 붙어 있는가 */
  linked: boolean;
  /** 연결된 구글 계정의 이메일. 익명이면 null. */
  email: string | null;
  savedCount: number;
  listCount: number;
  creators: SubscribedCreator[];
}

export const EMPTY_ACCOUNT: AccountView = {
  userId: null,
  linked: false,
  email: null,
  savedCount: 0,
  listCount: 0,
  creators: [],
};

export const loadAccount = cache(_loadAccount);

async function _loadAccount(): Promise<AccountView> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return EMPTY_ACCOUNT;

  /* is_anonymous 는 익명 세션에서 true 다. 구글로 승격하면 false 가 된다. */
  const linked = user.is_anonymous !== true;

  /* 개수만 필요한 두 질의는 행을 안 가져온다 — head:true 로 count 만 받는다.
     저장이 수백 개인 유저에게 목록을 통째로 실어 나를 이유가 없다. */
  const [subsRes, savedRes, listsRes] = await Promise.all([
    sb.from("subscriptions").select("creator_id").order("created_at", { ascending: false }),
    sb.from("saved_places").select("place_id", { count: "exact", head: true }),
    sb.from("saved_lists").select("id", { count: "exact", head: true }),
  ]);

  const creatorIds = (subsRes.data ?? []).map((s) => s.creator_id).filter(Boolean) as string[];

  let creators: SubscribedCreator[] = [];
  if (creatorIds.length > 0) {
    const { data: rows } = await supabase
      .from("creators")
      .select("id, slug, display_name, initials, accent_color, avatar_url, youtube_handle")
      .in("id", creatorIds);

    const byId = new Map((rows ?? []).map((c) => [c.id, c]));
    /* 구독 순서(최근 구독 먼저)를 따른다 — creators 질의는 순서를 보장하지 않는다. */
    creators = creatorIds.flatMap((id) => {
      const c = byId.get(id);
      if (!c) return []; // 채널이 내려갔다. 조용히 뺀다.
      return [
        {
          id: c.id,
          slug: c.slug,
          displayName: c.display_name,
          initials: c.initials,
          accent: c.accent_color,
          avatarUrl: c.avatar_url,
          handle: c.youtube_handle,
        },
      ];
    });
  }

  return {
    userId: user.id,
    linked,
    email: linked ? (user.email ?? null) : null,
    savedCount: savedRes.count ?? 0,
    listCount: listsRes.count ?? 0,
    creators,
  };
}
