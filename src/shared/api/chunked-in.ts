/**
 * PostgREST `.in()` 은 URL 길이 제한이 있다. uuid 수백 개를 한 번에 넣으면
 * 쿼리가 조용히 실패하고 허브가 빈 화면이 된다 (정육왕 414편에서 재현).
 */
export async function chunkedIn<T>(
  run: (ids: string[]) => PromiseLike<{ data: T[] | null }>,
  ids: string[],
  size = 80,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const { data } = await run(ids.slice(i, i + size));
    if (data?.length) out.push(...data);
  }
  return out;
}
