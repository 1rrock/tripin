import type { Metadata } from "next";
import { publicEnv } from "@/shared/config/env";
import "./globals.css";

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
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
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
        {/* Pretendard Variable — 다이나믹 서브셋 CDN (next/font 는 이 서체를 제공하지 않음) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 한국형 정보 서비스 표준(캐논) — 웜 화이트 지면 위에서 여백·괘선·타이포 위계만으로 선다. 색은 행동과 하이라이트에만. 회색 대시보드도, 유튜브 트레이드드레스도 아니다. "모든 장소는 영상에서 왔다"는 제품 진실은 타임코드와 아웃링크가 말한다.
OWN-WORLD: 웜 화이트 #fffdf8 + 베이지 필 #f4efe6, 잉크 #141414 텍스트, 1px 라인 #e5e0d4 괘선, 코랄 #ff5a3c(담기·주 행동)·레몬 #ffd43a(하이라이트·도시 칩), 12~24px 라운드 + 필 칩, 그림자는 모바일 시트 하나뿐. Pretendard 단일 서체. 크리에이터 액센트(--hl)는 번호 뱃지·지도 핀·선택 강조에만.
STORY: 검색 유입자가 3초 안에 "내 유튜버의 이 도시 지도"임을 알고, 훑고 → 담고 → 타임스탬프 영상/지도 앱으로 나간다.
FIRST VIEWPORT: 홈 — 잉크 타이포 헤드라인("간 곳만" 레몬 밑줄) + 잉크 CTA, 아래로 레몬 티커(실제 장소·타임코드 흐름), 1px 보더 크리에이터 카드.
FORM: 캐논 — 품질 기준선 토스·카카오맵·당근·트리플 (2026-08-05 사용자 결정: 시안 B "Color Pop"을 되돌리고 캐논으로 통일. 핵심 화면 Explorer가 이미 캐논이고 자원 80%가 그쪽에 있다).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
