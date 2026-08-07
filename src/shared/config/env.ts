/**
 * 환경 변수 wrapper.
 *
 * Tripin은 SEO가 핵심이라 SSG/ISR을 쓴다 — 즉 **서버 런타임이 있다.**
 * (히든스팟은 앱인토스라 서버가 없어서 전부 클라이언트에서 Supabase를 직접 불렀다.
 *  Tripin은 공개 페이지 대부분이 빌드 타임에 서버에서 구워져 나간다.)
 *
 * 그래서 값이 두 종류로 갈린다:
 *   · publicEnv — NEXT_PUBLIC_ 접두사. 브라우저 번들에 인라인된다. 노출 전제.
 *   · serverEnv() — 서버에서만 읽는다. 클라이언트에서 호출하면 throw.
 *
 * ⚠️ NEXT_PUBLIC_ 값은 반드시 **정적 리터럴 접근**이어야 한다.
 *    process.env[key] 같은 동적 접근은 클라이언트 번들에 인라인되지 않아
 *    브라우저에서 undefined가 된다.
 */

export const publicEnv = {
  appEnv: process.env["NEXT_PUBLIC_APP_ENV"] ?? "development",
  siteUrl: process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000",

  /** Supabase 프로젝트 URL — 공개값. */
  supabaseUrl: process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "",

  /**
   * anon 키 — 공개 전제. RLS(Row Level Security)로 보호된다.
   *
   * ⚠️ 이 키의 안전성은 전적으로 RLS에 달려 있다.
   *    테이블을 만들 때 RLS를 켜지 않으면 이 키만으로 전체 읽기·쓰기가 뚫린다.
   *    새 테이블 생성 시 `alter table ... enable row level security;` 를 항상 같이 쓴다.
   */
  supabaseAnonKey: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",

  /**
   * 구글 Maps JavaScript API 키 — **지도 렌더링 전용.**
   *
   * 브라우저가 maps.googleapis.com 을 직접 부르는 구조라 노출이 불가피하다.
   * 히든스팟과 같은 방어를 쓴다 — Cloud Console 에서 반드시:
   *   · API 제한: "Maps JavaScript API" 하나만 ← 새어도 비싼 호출(Places 등) 불가
   *   · 애플리케이션 제한: HTTP 리퍼러 (localhost:3000 + 배포 도메인)
   *
   * 렌더러가 구글 지도이므로 Places 데이터 표시가 약관상 허용된다 (LEGAL.md 4장 A안).
   */
  googleMapsKey: process.env["NEXT_PUBLIC_GOOGLE_MAPS_KEY"] ?? "",

  /** AdvancedMarker 에 필요한 Map ID. 미설정 시 개발용 DEMO_MAP_ID. */
  googleMapsId: process.env["NEXT_PUBLIC_GOOGLE_MAPS_ID"] ?? "DEMO_MAP_ID",
} as const;

export const isProduction = publicEnv.appEnv === "production";

/** 서버 전용 값을 읽는다. 클라이언트 번들에서 호출되면 즉시 throw. */
function requireServer(name: string): string {
  if (typeof window !== "undefined") {
    throw new Error(
      `[env] ${name} 은 서버 전용입니다. 클라이언트 컴포넌트에서 읽으려 했습니다. ` +
        `서버 컴포넌트나 route handler로 옮기세요.`,
    );
  }
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] ${name} 이 설정되지 않았습니다. .env.local 을 확인하세요 (.env.example 참조).`,
    );
  }
  return value;
}

/**
 * 서버 전용 환경 변수.
 *
 * 게으르게 읽는다 — 모듈 로드 시점이 아니라 실제 호출 시점에 검증한다.
 * 어드민 키가 없어도 공개 페이지 빌드는 돌아가야 하기 때문.
 */
export const serverEnv = {
  /**
   * 🔴 service_role 키 — RLS를 **전부 우회**한다.
   *    어드민 라우트와 로컬 스크립트에서만. 절대 클라이언트로 넘기지 말 것.
   */
  supabaseServiceRoleKey: () => requireServer("SUPABASE_SERVICE_ROLE_KEY"),

  /**
   * YouTube Data API 키.
   * ⚠️ 쿼터: playlistItems.list = 1 unit / search.list = 100 units.
   *    search.list 는 쓰지 않는다 (INGEST.md 2장).
   */
  youtubeApiKey: () => requireServer("YOUTUBE_API_KEY"),

  /**
   * Google Places 키 — **딥링크용 place_id 조회 전용.**
   * ⛔ 여기서 받은 상호·주소·좌표를 지도에 표시하면 약관 위반이다(LEGAL.md 4장).
   *    지도용 좌표는 Overture/Foursquare 오픈 데이터셋에서 가져온다.
   */
  googlePlacesApiKey: () => requireServer("GOOGLE_PLACES_API_KEY"),

  /** 자막 → 장소 후보 분석용 (어드민 전용). */
  anthropicApiKey: () => requireServer("ANTHROPIC_API_KEY"),

  /** /admin 접근 보호. */
  adminSecret: () => requireServer("ADMIN_SECRET"),

  /**
   * /api/cron/* 접근 보호.
   *
   * 크론 라우트는 proxy.ts 의 matcher(`/admin`, `/api/admin`) 밖이라 인증이 안 걸린다.
   * 스케줄러(Vercel Cron 등)가 `Authorization: Bearer <이 값>` 으로 부르고,
   * 라우트가 직접 대조한다. 값이 없으면 라우트가 throw 해서 **열린 채로 뜨지 않는다** —
   * 이게 기본값을 주지 않는 이유다.
   */
  cronSecret: () => requireServer("CRON_SECRET"),
} as const;
