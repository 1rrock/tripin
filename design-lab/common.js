/* Eatripin design-lab — demo content. Numbers are illustrative, not claims. */
window.EATRIPIN = {
  cities: [
    { slug: "tokyo", name: "도쿄", en: "Tokyo", places: 86, creators: 4, img: "tokyo.jpg" },
    { slug: "osaka", name: "오사카", en: "Osaka", places: 54, creators: 3, img: "osaka.jpg" },
    { slug: "fukuoka", name: "후쿠오카", en: "Fukuoka", places: 41, creators: 2, img: "fukuoka.jpg" },
    { slug: "bangkok", name: "방콕", en: "Bangkok", places: 33, creators: 2, img: "bangkok.jpg" },
    { slug: "taipei", name: "타이베이", en: "Taipei", places: 22, creators: 1, img: "taipei.jpg" },
    { slug: "paris", name: "파리", en: "Paris", places: 18, creators: 1, img: "paris.jpg" },
  ],
  channels: [
    { slug: "kwak", name: "곽튜브", initials: "곽", color: "#C62828", cities: ["도쿄", "오사카", "후쿠오카"], places: 67 },
    { slug: "ppani", name: "빠니보틀", initials: "빠", color: "#00897B", cities: ["파리", "방콕", "도쿄"], places: 48 },
    { slug: "wonji", name: "원지의하루", initials: "원", color: "#E6A817", cities: ["타이베이", "도쿄"], places: 37 },
    { slug: "choo", name: "츄성훈", initials: "츄", color: "#1565C0", cities: ["오사카", "후쿠오카"], places: 31 },
  ],
  places: [
    { id: 1, name: "이치란 본점", local: "一蘭 本店", type: "라멘", area: "시부야", addr: "도쿄도 시부야구 도겐자카 2-12", x: 38, y: 58, img: "ramen.jpg", t: "14:32",
      summary: "칸막이 좌석의 톤코츠. 낮 12시 전이 덜 붐빈다. 줄을 서도 회전이 빠르다." },
    { id: 2, name: "스시 사이토", local: "鮨 さいとう", type: "스시", area: "미나토", addr: "도쿄도 미나토구 아카사카 1-7", x: 52, y: 42, img: "sushi.jpg", t: "08:05",
      summary: "카운터 여덟 석. 예약이 어렵다. 영상에선 오마카세 코스 중 참치 세 점이 길게 나온다." },
    { id: 3, name: "츠키지 야마초", local: "築地 山長", type: "참치", area: "츠키지", addr: "도쿄도 주오구 츠키지 4-10", x: 64, y: 61, img: "sushi.jpg", t: "22:18",
      summary: "아침 시장 쪽 참치 덮밥. 영상 속 줄은 길지만 포장 창구가 따로 있다." },
    { id: 4, name: "블루보틀 신주쿠", local: "Blue Bottle Shinjuku", type: "카페", area: "신주쿠", addr: "도쿄도 신주쿠구 신주쿠 3-14", x: 44, y: 34, img: "cafe.jpg", t: "31:40",
      summary: "영상 후반, 걸어서 옮기는 구간. 창가 자리가 지도 핀 기준이다." },
    { id: 5, name: "우동 신", local: "うどん 慎", type: "우동", area: "긴자", addr: "도쿄도 주오구 긴자 6-4", x: 58, y: 72, img: "ramen.jpg", t: "41:02",
      summary: "점심 한정 붓카케. 영상에선 한 그릇만 나오고 바로 다음 장소로 이동한다." },
    { id: 6, name: "야키니쿠 호루몬 후지", local: "ホルモン藤", type: "야키니쿠", area: "에비스", addr: "도쿄도 시부야구 에비스 1-9", x: 33, y: 76, img: "yakiniku.jpg", t: "52:11",
      summary: "저녁 타임. 호루몬 모둠이 메인. 예약 없이 바 좌석이 비는 편이다." },
  ],
};

window.lab = {
  go(id) { location.href = id; },
  page(name) {
    document.querySelectorAll("[data-page]").forEach((el) => {
      el.hidden = el.dataset.page !== name;
    });
    window.scrollTo(0, 0);
    document.body.dataset.view = name;
  },
  sheet(place, extra = {}) {
    const root = document.getElementById("sheet");
    if (!root || !place) return;
    const ch = extra.channel || "곽튜브";
    root.hidden = false;
    root.innerHTML = `
      <div class="sheet-scrim" data-close></div>
      <aside class="sheet-card" role="dialog" aria-label="${place.name}">
        <button class="sheet-x" type="button" data-close aria-label="닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <div class="sheet-cut"><img src="assets/${place.img}" alt=""></div>
        <div class="sheet-body">
          <p class="sheet-k">${place.type} · ${place.area}</p>
          <h2>${place.name}</h2>
          <p class="sheet-local">${place.local}</p>
          <p class="sheet-addr">${place.addr}</p>
          <p class="sheet-sum">${place.summary}</p>
          <div class="sheet-src">
            <img src="assets/tokyo.jpg" alt="">
            <div>
              <b>${ch} · 도쿄에서 먹은 것들</b>
              <span>${place.t}에 나옴</span>
            </div>
          </div>
          <div class="sheet-cta">
            <a class="btn-yt" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=872s" target="_blank" rel="noopener">영상 보기</a>
            <a class="btn-map" href="https://maps.google.com/?q=${encodeURIComponent(place.name + " " + place.addr)}" target="_blank" rel="noopener">지도 앱에서 열기</a>
          </div>
        </div>
      </aside>`;
    root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => { root.hidden = true; }));
  },
};

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-open]");
  if (!t) return;
  e.preventDefault();
  lab.page(t.dataset.open);
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-pin]");
  if (!t) return;
  const place = EATRIPIN.places.find((p) => String(p.id) === t.dataset.pin);
  lab.sheet(place, { channel: t.dataset.ch });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const s = document.getElementById("sheet");
    if (s) s.hidden = true;
  }
});
