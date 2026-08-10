import type { Metadata } from "next";
import { Archivo, Gothic_A1 } from "next/font/google";
import { publicEnv } from "@/shared/config/env";
import { getLocale } from "@/shared/i18n/locale";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import "./globals.css";

/**
 * 콘택트 시트의 서체.
 *
 * Gothic A1 — 한글. 기하학적 고딕이라 각진 프레임·인덱스와 붙고, 100~900 이라
 * 제목(900)과 본문(400) 사이를 한 패밀리로 벌릴 수 있다. Noto 는 워크호스지만
 * 표정이 없어서 어두운 지면에서 화면이 밋밋해진다.
 *
 * Archivo — 라틴·숫자 전용. 인덱스 번호·타임코드·개수가 이 월드에서 자주
 * 주인공이 되는데(콘택트 시트의 프레임 번호), 한글 폰트의 라틴 숫자는 대체로
 * 폭이 좁고 밋밋하다. Archivo 는 그로테스크에 tabular numerals 가 있어
 * 표처럼 줄 세워도 흔들리지 않는다.
 *
 * 둘 다 next/font 셀프호스팅 — 외부 요청이 LCP 앞에 끼지 않는다.
 */
const gothic = Gothic_A1({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-gothic",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * 루트 폴백 메타데이터 — 페이지가 자기 `generateMetadata`에서 `openGraph`를
 * 명시적으로 오버라이드하지 않으면 여기로 떨어진다. 로케일을 몰라 정적으로
 * "ko_KR"·한국어 문구가 고정돼 있었는데, 그러면 openGraph를 안 채우는 페이지의
 * EN 공유 카드가 전부 한국어로 나간다 — `getLocale()`로 풀어서 고쳤다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: {
      default: m.meta.homeTitle,
      template: `%s | ${m.brand}`,
    },
    description: m.meta.homeDescription,
    /* 공유 카드 기본값 — images 는 opengraph-image.tsx 파일 규약이 자동으로 채운다 */
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ko_KR",
      siteName: m.brand,
      title: m.meta.homeTitle,
      description: m.meta.homeDescription,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${gothic.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 이 서비스가 가진 유일한 시각 재료는 영상 썸네일이다. 그래서 썸네일을 늘어놓는 게 본업인 물건 — 암실의 콘택트 시트 — 을 지면으로 삼는다. 거부하는 배치: 픽토그램과 괘선으로 화면을 채우는 정보 서비스 캐논(2026-08-05~06 의 두 월드가 연달아 여기서 무너졌다), 그리고 지도 퍼스트 여행 앱.
OWN-WORLD: 암실 지면 #0b0b0c 위에 16:9 프레임이 놓이고, 프레임만이 빛난다. 인화지 흰색 #f5f3ef 가 제목과 인덱스, 왁스 연필 #ff3d14 는 **표시에만** — 링·밑줄·활성 인덱스이지 버튼 배경이 아니다. 발광 금지(이 어둠은 네온이 아니라 은염). 라운드 4px, 실제 오프셋 그림자, 아주 약한 필름 그레인. Gothic A1(한글 400~900) + Archivo(라틴·숫자 tabular).
STORY: 밤에 여행 영상을 보던 사람이 "그 가게 어디였지"로 들어와, 프레임을 훑고 → 그 아래 실제 상호명을 보고 → 타임코드가 붙은 영상과 지도로 나간다.
FIRST VIEWPORT: 홈 — 제목 두 줄과 규모 한 줄 아래로 곧장 영상 프레임 시트. 첫 프레임은 전폭, 각 프레임 아래에 그 영상에 나온 실제 상호명이 붙어 메커니즘을 즉시 증명한다.
FORM: 콘택트 시트(다크 시네마틱 계열). 룰렛 배정 아님 — 사용자가 구조화 질문에서 직접 핀했다(브리프 핀이 룰을 이긴다). 직전 월드 seed 21af9ba1 은 폐기.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
