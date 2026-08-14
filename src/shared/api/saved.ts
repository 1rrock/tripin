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

import { supabaseBrowser, ensureSession } from "./supabase-browser";

export type SavedSnapshot = {
  /** 저장한 장소 id */
  places: Set<string>;
  /** 그중 '갔던 곳' 으로 체크한 장소 id */
  visited: Set<string>;
  /** 구독한 채널 id */
  creators: Set<string>;
};

export const EMPTY_SNAPSHOT: SavedSnapshot = {
  places: new Set(),
  visited: new Set(),
  creators: new Set(),
};

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

  const [saves, subs] = await Promise.all([
    sb.from("saved_places").select("place_id, visited"),
    sb.from("subscriptions").select("creator_id"),
  ]);

  const snapshot: SavedSnapshot = {
    places: new Set(),
    visited: new Set(),
    creators: new Set(),
  };

  for (const row of saves.data ?? []) {
    if (!row.place_id) continue;
    snapshot.places.add(row.place_id);
    if (row.visited) snapshot.visited.add(row.place_id);
  }
  for (const row of subs.data ?? []) {
    if (row.creator_id) snapshot.creators.add(row.creator_id);
  }
  return snapshot;
}

/** 저장 토글. 성공하면 true. 익명 세션 생성이 막혀 있으면 false. */
export async function setSaved(placeId: string, next: boolean): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;
  const sb = supabaseBrowser();

  if (!next) {
    const { error } = await sb.from("saved_places").delete().eq("place_id", placeId);
    return !error;
  }

  /* upsert 를 쓰는 이유: 저장을 껐다 켜는 사이에 다른 탭에서 이미 저장했으면
     insert 가 PK 충돌로 실패한다. 유저 입장에선 "하트를 눌렀는데 안 켜짐"이다. */
  const { error } = await sb
    .from("saved_places")
    .upsert({ user_id: uid, place_id: placeId }, { onConflict: "user_id,place_id" });
  return !error;
}

/**
 * '갔던 곳' 토글.
 *
 * 저장이 안 돼 있으면 같이 저장한다 — 가본 곳을 목록에서 못 보는 게 더 이상하다.
 * `visited_at` 을 같이 넘기는 것은 선택이 아니다. DB 의
 * `saved_places_visited_needs_time` 제약이 visited=true 인데 시각이 비면 거부한다.
 */
export async function setVisited(placeId: string, next: boolean): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;
  const sb = supabaseBrowser();

  const { error } = await sb.from("saved_places").upsert(
    {
      user_id: uid,
      place_id: placeId,
      visited: next,
      visited_at: next ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,place_id" },
  );
  return !error;
}

/** 채널 구독 토글. */
export async function setSubscribed(creatorId: string, next: boolean): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;
  const sb = supabaseBrowser();

  if (!next) {
    const { error } = await sb.from("subscriptions").delete().eq("creator_id", creatorId);
    return !error;
  }
  const { error } = await sb
    .from("subscriptions")
    .upsert({ user_id: uid, creator_id: creatorId }, { onConflict: "user_id,creator_id" });
  return !error;
}

/**
 * 익명 계정을 구글 계정으로 **승격**한다.
 *
 * ⚠️ signInWithOAuth 는 익명 세션을 새 세션으로 갈아치우지 않는다 —
 *    linkIdentity 가 같은 auth.users.id 에 구글 신원을 붙인다. id 가 유지되므로
 *    saved_places·subscriptions 를 손대지 않아도 그대로 따라온다.
 *    signInWithOAuth 를 쓰면 **새 유저가 생기고 모아둔 것이 전부 사라진다.**
 */
export async function linkGoogle(redirectTo: string): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data: session } = await sb.auth.getSession();

  if (session.session) {
    const { error } = await sb.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    return error ? error.message : null;
  }

  /* 저장한 것이 없는 상태에서 로그인부터 하는 경우 — 승계할 게 없으니 평범한 로그인 */
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return error ? error.message : null;
}
