import { loadHomeFeed } from "@/shared/api/home";
import { HomeSheet } from "./HomeSheet";

/**
 * 홈 = 영상 콘택트 시트.
 *
 * 예전 홈은 채널 명단이었다(CONCEPT.md 4.1). 채널이 1개인 지금 그 화면은
 * 카드 한 장이라 어떤 월드를 씌워도 비어 보였고, 두 번의 리디자인이 연달아
 * 여기서 무너졌다. 분량이 있는 축은 영상이므로 단위를 영상으로 바꿨다.
 * 채널 축은 시트 아래에 남아 있고, 채널이 늘면 그쪽이 다시 커진다.
 *
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
