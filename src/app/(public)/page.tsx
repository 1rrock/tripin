import { loadHomeFeed } from "@/shared/api/home";
import { HomeSheet } from "./HomeSheet";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입 (멀티채널 전제).
 *
 * 도시·채널 칩으로 좁히고 영상은 페이지 단위. 채널 목록이 디렉터리 입구.
 * 세계지도를 깔지 않는 원칙(P1)은 그대로다 — 빈 지도는 "아무것도 없는 서비스"다.
 * anon 클라이언트 → RLS 가 is_published=true 만 내려준다.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const { videos, creators, totals } = await loadHomeFeed();

  if (videos.length === 0) {
    return (
      <main className="px-(--gutter) pt-6 pb-20">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          곧 열립니다
        </h1>
        <p className="mt-4 max-w-[46ch]" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          첫 지도를 준비하고 있습니다. 확정된 장소가 쌓이는 대로 채널이 열립니다.
        </p>
      </main>
    );
  }

  return (
    <main>
      <HomeSheet videos={videos} creators={creators} totals={totals} />
    </main>
  );
}
