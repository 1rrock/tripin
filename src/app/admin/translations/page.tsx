import type { Metadata } from "next";
import { loadAdminCityIntros, loadAdminTranslations } from "../_lib/queries";
import { TranslationsClient } from "./TranslationsClient";

export const metadata: Metadata = { title: "번역 검수 — Eatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 영문 번역 검수 (docs/HANDOFF.md, 마이그레이션 0007).
 *
 * `scripts/translate-en.mjs` 가 채운 기계 초벌(`en_source='machine'`)을 원문과 나란히
 * 대조해 고치고 `human` 으로 올리는 화면. "기계번역 일괄 공개 금지"(docs/I18N.md §7,
 * LEGAL.md 359 AdSense 독립적 가치 요건) 정책을 지키는 유일한 경로다.
 */
export default async function AdminTranslationsPage() {
  const [places, cityIntros] = await Promise.all([loadAdminTranslations(), loadAdminCityIntros()]);
  return <TranslationsClient places={places} cityIntros={cityIntros} />;
}
