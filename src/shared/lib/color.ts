/** #rrggbb 의 근사 명도 판정 — 어두운 액센트색 위 글자색 선택용 (자막 월드 공용). */
export function isDarkHex(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
