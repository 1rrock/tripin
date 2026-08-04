import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR, Spline_Sans_Mono } from "next/font/google";
import { publicEnv } from "@/shared/config/env";
import "./globals.css";

/** 자막체 — 예능·여행 영상 편집자막의 목소리. 장소명·헤딩 전용. */
const subtitleFace = Black_Han_Sans({
  variable: "--font-subtitle",
  weight: "400",
  subsets: ["latin"],
});

/** 타임코드 모노 — 타임스탬프 칩·통계 수치 전용. */
const timecodeFace = Spline_Sans_Mono({
  variable: "--font-timecode",
  subsets: ["latin"],
});

/** 본문 — 한국어 워크호스. */
const bodyFace = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "여행 유튜버가 간 곳 지도 | Tripin",
    template: "%s | Tripin",
  },
  description:
    "채널을 고르면 그 여행 유튜버가 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소에 출처 영상 링크가 있습니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${subtitleFace.variable} ${timecodeFace.variable} ${bodyFace.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 모든 핀은 영상에서 왔다 — 여행 유튜브 편집자막 문법(자막체·형광펜·타임코드 칩·챕터 바)이 UI 언어다. 정석 지도 디렉터리(흰 바탕 + 파란 액센트 + 카드 그리드)는 거부한다.
OWN-WORLD: 화이트 스튜디오 지면 위 잉크 블랙 자막체(Black Han Sans). 크리에이터 액센트색 형광펜 하이라이트(홈·브랜드는 옐로 #FFD400), 블랙 모노 타임코드 칩 1:55▸, [대괄호] 메타 라벨, 장소 수만큼 나뉜 세그먼트 챕터 바.
STORY: 검색으로 들어온 시청자가 3초 안에 "내 유튜버의 이 도시 지도"임을 알아보고, 핀/리스트에서 타임스탬프 영상과 지도 앱으로 나간다.
FIRST VIEWPORT: 모바일 375px — 브레드크럼, 자막체 H1(도시 키워드에 형광펜), 챕터 바, 지도 40vh, 리스트 1번 항목의 자막 블록.
FORM: 여행 영상 편집자막 — 그라운디드 리스트 5번, seed fda20065.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
