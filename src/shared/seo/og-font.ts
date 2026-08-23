/**
 * OG 카드용 한글 폰트 로더 — satori 에는 한글 폰트가 없다. 없으면 두부(tofu)로
 * 렌더된다. 구글 폰트 css2 API 를 **구형 UA** 로 부르면 woff2 대신 truetype 을 주고,
 * `text=` 로 실제 쓰는 글자만 서브셋해 수 KB 로 떨어진다.
 * 실패하면 null 을 돌려주고 호출부가 라틴 전용 레이아웃으로 물러난다.
 *
 * ⚠️ UA 에 MSIE 토큰을 넣으면 EOT 를 준다 — satori 가 못 읽고 렌더가 통째로 죽는다.
 *    "Mozilla/4.0" 만 보낼 것. 아래 시그니처 검사가 최후 방어선이다.
 *
 * `(public)/[lang]` 아래 opengraph-image.tsx 11곳(+ 앱 루트 기본 카드)이 전부
 * 이 함수를 쓴다 — 예전엔 5곳이 같은 함수를 인라인으로 복제해 갖고 있었는데
 * 손대는 김에 여기로 옮겼다(AUDIT-2026-08-23).
 */
export async function loadKoreanFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Gothic+A1:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/4.0" } },
    );
    if (!css.ok) return null;
    const url = /src:\s*url\(([^)]+)\)\s*format\('truetype'\)/.exec(await css.text())?.[1];
    if (!url) return null;
    const font = await fetch(url);
    if (!font.ok) return null;
    const data = await font.arrayBuffer();
    return isOpenType(data) ? data : null;
  } catch {
    return null;
  }
}

/** sfnt 매직 넘버 — 0x00010000(TrueType) / "true" / "OTTO". 아니면 satori 가 throw 한다. */
function isOpenType(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const tag = new DataView(data).getUint32(0);
  return tag === 0x00010000 || tag === 0x74727565 || tag === 0x4f54544f;
}

/** 한글 음절·자모 범위. */
const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;

/**
 * 이 텍스트를 그리려면 한글 폰트가 필요한가.
 *
 * **로케일이 아니라 실제로 그릴 글자로 판단한다.** EN 카드도 사람·채널·도시
 * 이름 같은 사용자 데이터는 영문명이 비어 있으면 한글 원문으로 물러난다
 * (`displayCityName`·`displayPlaceName` 등) — 로케일만 보고 "en 이니 폰트 생략"
 * 하면 그 물러난 한글이 두부로 뜬다. 앱이 직접 쓰는 카피(홈·지도 카드처럼
 * 로케일별로 완전히 다른 문자열을 준비한 경우)는 이 판정이 그냥 `locale==="ko"`
 * 와 같은 값이 되므로 손해가 없다.
 */
export function needsKoreanFont(text: string): boolean {
  return HANGUL.test(text);
}
