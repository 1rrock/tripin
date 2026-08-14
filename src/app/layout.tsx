import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Archivo } from "next/font/google";
import localFont from "next/font/local";
import { publicEnv } from "@/shared/config/env";
import { getLocale } from "@/shared/i18n/locale";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { siteOrigin } from "@/shared/seo/page-meta";
import { JsonLd, organizationNode, websiteNode } from "@/shared/seo/json-ld";
import "./globals.css";

/**
 * 서체.
 *
 * 페이퍼로지(Paperlogy) — 한글 구조와 본문. 굵기로 얼굴을 가른다(700/800 제목, 400/500 본문).
 * Archivo — 라틴 숫자 tabular. 타임코드·개수 정렬.
 *
 * 브랜드 마크: TP ligature (크림 면 + 산호 T·P). 워드마크는 Paperlogy.
 *
 * next/font 셀프호스팅 — 외부 요청이 LCP 앞에 끼지 않는다.
 */
/**
 * 실제 쓰는 5단만 싣는다.
 *
 * 9단을 다 선언했을 때 Thin·ExtraLight·Light·ExtraBold 는 코드에서 **한 번도**
 * 참조되지 않는데(`font-thin`·`font-light`·`font-extrabold` grep = 0), next/font 는
 * 선언된 src 를 전부 `<link rel=preload>` 로 내보낸다. 한글 woff2 는 단당 ~160KB —
 * 안 쓰는 4단이 매 페이지 634KB 를 LCP 앞에 밀어 넣고 있었다.
 *
 * `preload: false` 인 이유: `display: "swap"` 이라 폰트가 오기 전에도 폴백으로
 * 글자가 이미 보인다. preload 는 스왑 시점을 당길 뿐인데, 그 대가로 800KB 가
 * LCP 이미지와 대역폭을 다툰다. 브라우저는 이제 그 페이지가 실제 쓴 단만 받는다.
 */
const paper = localFont({
  src: [
    { path: "./fonts/Paperlogy-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Paperlogy-5Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Paperlogy-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Paperlogy-7Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Paperlogy-9Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-paper",
  display: "swap",
  preload: false,
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
    robots: {
      googleBot: {
        "max-image-preview": "large",
      },
    },
    verification: {
      google: "lkxLO-HERLGf1WGk8DEGktQW_kCeCwXphuEsfj8NGog",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const site = siteOrigin();
  return (
    <html lang={locale} className={`${paper.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <JsonLd
          data={[
            websiteNode(site, m.brand, m.meta.homeDescription),
            organizationNode(site, m.brand, m.meta.homeDescription),
          ]}
        />
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 유튜브에서 본 가게를 상호와 지도로 연결한다. 흰 종이 위의 사실 목록이고, 산호는 핀 하나로만 켜진다. 거부하는 배치: 웜 페이퍼 콘택트 시트, 베이지 그레인, 인덱스 자간 코스튬, 지도 퍼스트 여행 앱.
OWN-WORLD: 순백 #fff + 무채 잉크 #171717. 산호 #c9441a 는 마크·활성·주 CTA 만. 구분은 1px 헤어라인. 카드 크롬 없음. Phosphor weight 가 상태. Paperlogy 구조/본문 + 숫자 tabular. 16:9 프레임만 원본 비율.
STORY: 여행 영상을 보던 사람이 "그 가게 어디였지"로 들어와, 프레임을 훑고 → 그 아래 실제 상호명을 보고 → 타임코드가 붙은 영상과 지도로 나간다.
FIRST VIEWPORT: 홈 — 검색 한 칸, 도시 타일, 채널×도시 조각. 썸네일 아래 상호명이 헤드라인.
FORM: 핀 하나만 산호 (hidden-spot 시스템 규율, Eatripin 브랜드). 유저 지정.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
