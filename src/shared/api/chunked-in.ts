/**
 * PostgREST `.in()` 은 URL 길이 제한이 있다. uuid 수백 개를 한 번에 넣으면
 * 쿼리가 조용히 실패하고 허브가 빈 화면이 된다 (정육왕 414편에서 재현).
 *
 * ⚠️ 그 교훈을 헬퍼가 직접 지킨다 — **에러를 삼키지 않는다.** 예전에는 `error`
 *    를 받을 수조차 없는 시그니처라, 페이지네이션 3쪽 중 2쪽에서 실패해도
 *    1쪽 분량이 "완전한 결과"로 반환됐다. 그 부분 결과가 `cachePublic` 에
 *    1시간 굳으면 화면은 조용히 반쪽이 된다. 지금은 throw 한다 — 에러는
 *    `error.tsx` 가 받고 캐시는 오염되지 않는다.
 */

/** 쿼리 한 번의 결과. supabase 빌더가 그대로 들어맞는다. */
type Res<T> = { data: T[] | null; error: unknown };

function raise(where: string, error: unknown): never {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  throw new Error(`[${where}] supabase 쿼리 실패: ${message}`);
}

/** PostgREST 기본 한 페이지는 1000행. 전 테이블 스캔은 이걸로 이어 받는다. */
export async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<Res<T>>,
  page = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await run(from, from + page - 1);
    // 중간 쪽에서 실패하면 앞쪽만 담긴 배열이 완전한 결과처럼 나간다 — 막는다
    if (error) raise(`fetchAll@${from}`, error);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return out;
}

/** 한 번에 띄우는 청크 수. 순차 await 로 청크당 왕복을 다 물던 것을 걷어낸다.
 *  올리면 Supabase 커넥션 풀을 한 요청이 독점한다 — 6 이 상한. */
const CHUNK_CONCURRENCY = 5;

export async function chunkedIn<T>(
  run: (ids: string[]) => PromiseLike<Res<T>>,
  ids: string[],
  size = 80,
): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));

  const out: T[] = [];
  // 청크 순서를 지켜 담는다 — 호출부가 정렬을 이 순서에 기대는 곳이 있다
  for (let i = 0; i < chunks.length; i += CHUNK_CONCURRENCY) {
    const wave = await Promise.all(chunks.slice(i, i + CHUNK_CONCURRENCY).map((c) => run(c)));
    for (const { data, error } of wave) {
      // 실패한 청크를 조용히 건너뛰면 그 uuid 범위만 통째로 사라진 결과가 캐시된다
      if (error) raise("chunkedIn", error);
      if (data?.length) out.push(...data);
    }
  }
  return out;
}
