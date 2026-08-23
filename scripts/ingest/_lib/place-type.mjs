/**
 * Google Places 타입 → 우리 `place_type`. **분류 로직은 여기 하나뿐이다.**
 *
 * 왜 모듈로 뽑았나: 2026-08-24 재점검에서 확정 장소 1,845곳 중 1,724곳(93.4%)이
 * `restaurant` 인 것이 드러났는데, 원인 중 하나가 **분류기가 여러 벌로 갈린 것**이었다
 * (`tmp/ingest-creators.mjs` 의 `guessType` 은 cafe/hotel/attraction 분기가 아예 없고,
 * `tmp/ingest-sydney-spain.mjs` 의 같은 이름 함수만 제대로 갈랐다 — 그래서 시드니·
 * 세비야·그라나다만 분포가 정상이었다). 두 벌이 되는 순간 한쪽만 고쳐진다.
 * 새 인제스트 경로를 만들면 **여기를 import 해라. 다시 적지 마라.**
 *
 * ⚠️ 순서가 곧 우선순위다. **구체적인 것이 위, 범용이 아래.** 예전엔 restaurant 규칙이
 *    맨 위에 있으면서 `food` 를 물고 있었는데, Google 은 `food` 를 호텔·시장·역·백화점·
 *    박물관에도 붙인다. 현실적인 타입 배열 14종으로 돌려 보면 9종이 restaurant 로
 *    뭉개졌다. `food`·`point_of_interest`·`establishment` 같은 범용 토큰은 폴백에만 둔다.
 *
 * 반환값은 DB enum 에 있는 것만 — restaurant, cafe, attraction, hotel, bar, shop,
 * viewpoint, other, unknown (`0001_init.sql:83`) + fishing (`0012`).
 * 역·터미널은 enum 에 없다. `other` 로 접는다 — 우리 유저는 "가 볼 곳"을 찾는데
 * 역은 그 자체가 목적지가 아니라 경유지다. `attraction`(명소·관광)으로 넣으면
 * 도쿄역처럼 관광지인 역 몇 개 때문에 평범한 환승역이 명소 목록을 오염시킨다.
 */
/**
 * ⚠️ **`\b` 를 쓰지 마라 — 여기서 한 번 크게 당했다.**
 *    JS 정규식은 `_` 를 단어문자로 취급한다. Google 타입은 전부 snake_case 라
 *    `\brestaurant\b` 가 `hamburger_restaurant` 에 **안 걸린다**(앞이 `_` 라 경계가
 *    아니다). 그래서 구체 규칙이 통째로 무력화되고, 폴백이나 엉뚱한 규칙이 이겼다:
 *    2026-08-24 dry-run 에서 `Bar Luca`(primaryType `hamburger_restaurant`)가
 *    types 배열의 `bar` 하나로 **bar** 가 됐다.
 *    그래서 정규식을 **토큰 하나에 통째로**(`^…$`) 물리고, 접미사가 의미를 지는
 *    것만 `_restaurant$` 처럼 따로 적는다.
 */
export const TYPE_MAP = [
  ["hotel", /^(lodging|hotel|motel|resort_hotel|extended_stay_hotel|inn|guest_house|hostel|bed_and_breakfast|japanese_inn|budget_japanese_inn|ryokan|campground|camping_cabin|cottage|farmstay|rv_park)$/i],
  /* 역·터미널은 enum 에 없다. `other` 로 접는다 — 유저는 "가 볼 곳"을 찾는데 역은
     목적지가 아니라 경유지다. attraction 에 넣으면 도쿄역 몇 개 때문에 평범한
     환승역이 명소 목록을 오염시킨다. */
  ["other", /^(train_station|subway_station|light_rail_station|transit_station|transit_depot|bus_station|bus_stop|airport|international_airport|heliport|ferry_terminal|taxi_stand|parking|rest_stop)$/i],
  ["fishing", /^(fishing_charter|fishing_pond|fish_farm|marina)$/i],
  ["attraction", /^(tourist_attraction|museum|art_gallery|performing_arts_theater|park|national_park|state_park|dog_park|botanical_garden|garden|hiking_area|beach|plaza|temple|hindu_temple|shrine|shinto_shrine|church|mosque|synagogue|place_of_worship|zoo|aquarium|wildlife_park|wildlife_refuge|amusement_park|water_park|historical_landmark|historical_place|cultural_landmark|monument|sculpture|castle|observation_deck|planetarium|cultural_center|visitor_center)$/i],
  /* ⚠️ cafe 가 shop 보다 **위**다. 빵집·디저트 가게는 Google 이 `bakery` 와 `store`
     를 함께 다는데, shop 이 위에 있으면 전부 shop 으로 샌다(실측: `A La Paysanne`
     primaryType `pastry_shop` → shop). 우리 유저에겐 빵집이 "먹는 곳"이지 "사는 곳"이 아니다. */
  ["cafe", /^(cafe|coffee_shop|cat_cafe|dog_cafe|internet_cafe|cafeteria|bakery|pastry_shop|bagel_shop|donut_shop|dessert_shop|dessert_restaurant|ice_cream_shop|tea_house|juice_shop|chocolate_shop|candy_store|confectionery)$/i],
  ["bar", /^(bar|pub|night_club|wine_bar|bar_and_grill|liquor_store)$/i],
  /* `_restaurant$` 접미사를 반드시 먼저 잡는다 — Google 의 요리별 타입이 전부
     이 꼴이다(hamburger_restaurant·ramen_restaurant·korean_restaurant …). */
  ["restaurant", /_restaurant$|^(restaurant|fine_dining_restaurant|meal_takeaway|meal_delivery|food_court|steak_house|diner|deli|sandwich_shop|breakfast_restaurant|brunch_restaurant)$/i],
  ["shop", /_store$|_market$|^(market|store|shopping_mall|shopping_center|supermarket|grocery_store|convenience_store|department_store|book_store|clothing_store|gift_shop|souvenir_store|wholesaler)$/i],
];

/** 범용 토큰 — 위 구체 규칙이 **하나도** 안 걸렸을 때만 본다. */
export const TYPE_FALLBACK = [
  ["restaurant", /^(food|dining|food_and_drink)$/i],
  ["attraction", /^(point_of_interest|tourist)$/i],
];

/**
 * `primaryType` 을 먼저, 그것만으로 본다.
 * Google 의 primaryType 은 그 장소를 한 마디로 뭐라 부르는지다 — 가장 구체적이라
 * 여기서 걸리면 그게 답이다. 안 걸릴 때만 `types` 배열을 본다.
 *
 * ⚠️ types 를 한 문자열로 이어 붙여 검사하면 안 된다. 그러면 배열 어디에 있든
 *    "먼저 걸린 규칙"이 이기는 게 아니라 "먼저 걸린 **토큰**"이 이기고,
 *    호텔의 `food` 하나 때문에 restaurant 이 된다. 규칙을 바깥 루프로 돌려
 *    **구체적인 규칙이 배열 전체를 먼저 훑게** 한다.
 */
export function mapPlaceType(types = [], primary) {
  const list = (types ?? []).filter(Boolean);
  // 1) primaryType 을 구체 규칙으로 — 여기서 걸리면 그게 답이다
  if (primary) {
    for (const [t, re] of TYPE_MAP) if (re.test(primary)) return t;
  }
  // 2) types 배열을 구체 규칙으로 (규칙이 바깥 루프 — 구체적인 규칙이 배열 전체를 먼저 훑는다)
  for (const [t, re] of TYPE_MAP) if (list.some((x) => re.test(x))) return t;
  // 3) 그래도 모르면 범용 토큰
  for (const [t, re] of TYPE_FALLBACK) {
    if ((primary && re.test(primary)) || list.some((x) => re.test(x))) return t;
  }
  return "unknown";
}
