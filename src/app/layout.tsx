import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_KR } from "next/font/google";
import { publicEnv } from "@/shared/config/env";
import "./globals.css";

/**
 * 공항 사인 시스템의 서체 — 휴머니스트 산세.
 *
 * 시안의 Frutiger Next 는 유료라 쓸 수 없다. Noto Sans 가 같은 계열(휴머니스트,
 * 사인 가독성 목적으로 설계)의 무료 대체이고, Noto Sans KR 이 같은 슈퍼패밀리라
 * 한글·라틴이 한 시스템으로 붙는다.
 *
 * 라틴을 따로 두는 이유: 게이트 번호·타임코드처럼 숫자가 주인공인 자리가 많은데
 * Noto Sans 의 라틴 숫자가 KR 의 것보다 넓고 열려 있다.
 * CDN(jsdelivr) 대신 next/font 셀프호스팅 — 외부 요청이 LCP 앞에 끼지 않는다.
 */
const notoKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-kr",
  display: "swap",
});
const noto = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "여행 유튜버가 간 곳 지도 | Tripin",
    template: "%s | Tripin",
  },
  description:
    "채널을 고르면 그 여행 유튜버가 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소에 출처 영상 링크가 있습니다.",
  /* 공유 카드 기본값 — images 는 opengraph-image.tsx 파일 규약이 자동으로 채운다 */
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Tripin",
    title: "여행 유튜버가 간 곳 지도 | Tripin",
    description:
      "채널을 고르면 그 여행 유튜버가 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소에 출처 영상 링크가 있습니다.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoKr.variable} ${noto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          테마 선반영 — 하이드레이션 이전, 첫 페인트 이전에 동기 실행된다.
          이게 없으면 저장된 값이 다크여도 라이트로 한 번 그려졌다가 뒤집혀 깜빡인다(FOUC).
          저장값이 없으면 아무 속성도 붙이지 않아 globals.css 의
          prefers-color-scheme 이 그대로 주도권을 갖는다.
          <html> 에 suppressHydrationWarning 이 필요한 이유도 이 스크립트가
          서버 HTML 에 없던 속성을 하이드레이션 전에 추가하기 때문이다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tripin-theme');" +
              "if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 조각은 터미널이고 장소는 게이트다. 공항 사인 시스템의 문법 — 매달린 노란 밴드, 검정 휴머니스트 산세, 정사각 인셋 픽토그램, 모서리에 고정된 화살표 — 으로 "지금 어디로 갈지" 하나만 크게 말한다. 거부하는 배치: 여백과 괘선으로만 서는 정보 서비스 캐논(2026-08-05~08-06 의 월드), 그리고 지도 퍼스트 여행 앱.
OWN-WORLD: 사인 옐로 #ffcc00 이 길찾기 층을 통째로 갖는다(전폭 밴드) — 액센트가 아니라 지면이다. 콘크리트 #e5e5e5 위에 콘텐츠, 제트 블랙 #0d0d0d 이 구조·픽토그램 인셋·데이터 행. 누를 수 있는 것은 필이 아니라 검정 1.5px 사각 패널 + 우측 아이콘 인셋. 장소 번호는 게이트 번호처럼 기념비적 스케일. Noto Sans KR 단일 슈퍼패밀리(휴머니스트, 400~900).
STORY: 검색 유입자가 밴드 한 줄로 "내 유튜버 × 이 도시"임을 알고, 번호로 훑고 → 담고 → 화살표가 가리키는 타임코드 영상/지도 앱으로 나간다.
FIRST VIEWPORT: 조각(/c/[creator]/[city]) — 상단에 전폭 노란 밴드 하나("{크리에이터} → {도시} · 확정 12곳"), 그 아래 기념비적 번호로 선 장소 목록, 각 행 우측 모서리에 고정된 화살표가 영상·지도를 가리킨다. 지도는 밴드 아래.
FORM: 공항 사인 시스템 (wayfinding-cartography-signage-terminal-yellow-wayfinding). 룰렛 배정은 내 후보 3번 "답사 자료집"이었고, 융합 계량에서 이 챌린저가 청중 식별·제품 명료성 두 축 모두 이겨 빌드가 됐다. seed key 21af9ba1 (scope direction, mode operate). 사용자가 결정 페이지에서 확정.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
