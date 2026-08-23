import { notFound, redirect } from "next/navigation";
import { loadCityDetail } from "@/shared/api/cities";
import { isLocale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/locale";

/**
 * 존재 판정·리다이렉트 전용 레이아웃 — **그릴 것이 없다.** children 을 통과시킨다.
 *
 * 왜 여기인가: 같은 폴더의 `loading.tsx` 가 page 를 Suspense 로 감싸고, 그 경계가
 * 200 헤더를 **먼저** flush 한다. page 에서 뒤늦게 부른 `notFound()`·`redirect()` 는
 * 상태 코드를 바꾸지 못했다 — `/city/nowhere` 가 404 대신 200 이었고, 채널이
 * 1곳뿐인 도시(`/city/lockhart`·`hakodate`·`dallas`…)의 리다이렉트는 **한 번도
 * 나간 적이 없다**(Location 헤더 없는 200). `generateMetadata` 우회도 같은 이유로
 * 200 이다 — 메타데이터 해석도 경계 뒤에 있다.
 *
 * Next 의 계층은 `layout > Suspense(loading) > page` 다. layout 이 await 하면
 * 응답이 아직 flush 되지 않아 상태 코드가 제대로 나가고, page 본문의 느린 작업은
 * 여전히 `loading.tsx` 스켈레톤이 덮는다.
 *
 * 로더는 `cachePublic`(React `cache` 포함)이라 page·`generateMetadata` 와 같은
 * 요청 안에서는 첫 promise 를 나눠 쓴다 — 중복 왕복이 아니다.
 */
export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  /* Next 가 만드는 `LayoutProps` 는 세그먼트를 전부 `string` 으로 준다 — 여기서
     `Locale` 로 좁혀 받으면 빌드가 깨진다. 부모 `[lang]/layout.tsx` 도 `string` 이다. */
  params: Promise<{ lang: string; city: string }>;
}) {
  const { lang, city } = await params;
  /* 부모 레이아웃이 이미 `isLocale` 로 걸러 notFound() 하지만, 타입은 그걸 모른다 */
  const locale = isLocale(lang) ? lang : notFound();
  const data = await loadCityDetail(city);
  if (!data) notFound();

  /* 채널이 하나면 이 화면은 조각 페이지와 내용이 같다 — 중복 색인을 막으려고 넘긴다.
     `?type=` 은 싣지 못한다: 레이아웃은 `searchParams` 를 받지 않는다. 대신 page 가
     `searchParams` 를 안 읽게 되면서 이 라우트가 ISR 로 돌아왔다(매 요청 람다 SSR
     20~35ms → 2~3ms). 이 경로는 단일 채널 도시뿐이라 잃는 것이 작고, 필터 자체는
     `CityExplorer` 가 하이드레이션 뒤 `?type=` 을 읽어 그대로 건다.

     308(permanentRedirect)이 아니라 **307** 이다. 308 은 브라우저가 영구 캐시해서,
     채널이 2곳으로 늘어 도시 페이지가 되살아나도 예전 방문자는 영영 조각 페이지로
     튕긴다. 이 리다이렉트의 조건은 데이터에 따라 바뀌므로 영구가 아니다. */
  if (data.creators.length === 1) {
    const only = data.creators[0]!;
    redirect(localePath(`/c/${only.slug}/${data.slug}`, locale));
  }

  return children;
}
