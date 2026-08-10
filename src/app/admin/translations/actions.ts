"use server";

/**
 * /admin/translations 서버 액션 — 영문 번역 검수.
 *
 * `en_source` 는 `null`(영문 없음) → `machine`(기계 초벌) → `human`(검수 완료) 순으로만
 * 앞으로 간다. 여기 액션들은 전부 `human` 으로 올리는 쪽이고, 되돌리는 UI 는 없다
 * (되돌리려면 en_source 를 다시 machine 으로 낮춰야 하는데, 그건 스크립트 재실행의
 * 몫이지 검수자의 실수 복구용이 아니다).
 *
 * 공개 데이터(요약 EN·en_source)를 바꾸므로 `purgePublicData()` 를 같이 부른다
 * (`shared/api/cache.ts` 주석 참조 — revalidatePath 만으로는 로더 캐시가 안 비워진다).
 */

import { revalidatePath } from "next/cache";
import { purgePublicData } from "@/shared/api/cache";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import type { ActionResult } from "../_lib/action-result";


function afterWrite() {
  revalidatePath("/admin/translations");
  purgePublicData();
}

/**
 * 장소 영문 필드를 저장하고 동시에 `human` 검수완료로 올린다.
 * 수정과 승인을 한 액션으로 묶은 이유 — 검수자가 고친 결과를 저장했다는 것 자체가
 * 이미 사람이 확인했다는 뜻이라, 별도로 "승인" 버튼을 또 누르게 하면 손이 두 번 간다.
 */
export async function savePlaceTranslation(_: ActionResult, form: FormData): Promise<ActionResult> {
  const placeId = String(form.get("placeId") ?? "").trim();
  if (!placeId) return { error: "잘못된 요청입니다" };

  const summaryEn = String(form.get("summaryEn") ?? "").trim() || null;
  const bulletsEn = form
    .getAll("bulletEn")
    .map((b) => String(b).trim());
  const priceHintEn = String(form.get("priceHintEn") ?? "").trim() || null;

  const db = getSupabaseAdmin();
  const { data: place } = await db.from("places").select("name").eq("id", placeId).single();
  if (!place) return { error: "장소를 찾을 수 없습니다" };

  const { error } = await db
    .from("places")
    .update({
      summary_en: summaryEn,
      summary_bullets_en: bulletsEn,
      // address_en 은 건드리지 않는다 — 주소는 원문 유지가 설계다(공개 화면도 원문을 쓴다)
      price_hint_en: priceHintEn,
      en_source: "human",
      en_translated_at: new Date().toISOString(),
    })
    .eq("id", placeId);
  if (error) return { error: error.message };

  afterWrite();
  return { ok: `"${place.name}" 번역 저장 — 검수완료로 표시됨` };
}

/**
 * 기계 초벌을 고치지 않고 그대로 승인 — "수정 없이 승인" 버튼.
 * 번역할 내용 자체가 없는(en_source=null) 장소는 승인할 게 없으므로 호출자(화면)가 막는다.
 */
export async function approvePlaceTranslation(placeId: string): Promise<ActionResult> {
  const db = getSupabaseAdmin();
  const { data: place } = await db
    .from("places")
    .select("name, en_source")
    .eq("id", placeId)
    .single();
  if (!place) return { error: "장소를 찾을 수 없습니다" };
  if (!place.en_source) return { error: "아직 번역이 없어 승인할 수 없습니다" };

  const { error } = await db
    .from("places")
    .update({ en_source: "human", en_translated_at: new Date().toISOString() })
    .eq("id", placeId);
  if (error) return { error: error.message };

  afterWrite();
  return { ok: `"${place.name}" 수정 없이 승인됨` };
}

/**
 * 도시 인트로 영문 저장. `creator_cities` 에는 en_source 컬럼이 없다 —
 * 행 수가 적어(조각당 1개) 검수 상태를 별도로 추적하지 않고 값 유무로만 판단한다.
 */
export async function saveCityIntroTranslation(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const creatorId = String(form.get("creatorId") ?? "").trim();
  const cityId = String(form.get("cityId") ?? "").trim();
  if (!creatorId || !cityId) return { error: "잘못된 요청입니다" };
  const introTextEn = String(form.get("introTextEn") ?? "").trim() || null;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("creator_cities")
    .update({ intro_text_en: introTextEn })
    .eq("creator_id", creatorId)
    .eq("city_id", cityId);
  if (error) return { error: error.message };

  afterWrite();
  return { ok: "도시 인트로 영문 저장됨" };
}
