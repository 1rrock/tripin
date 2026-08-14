import { ImageResponse } from "next/og";
import { MARK_CREAM, MARK_WAX, TP_COUNTER, TP_OUTER } from "@/shared/ui/mark-geom";

/**
 * Apple touch icon — TP ligature (cream field + wax letters).
 * satori 는 evenodd 가 불완전해서 카운터를 크림으로 덮는다.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: MARK_CREAM,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512">
          <path d={TP_OUTER} fill={MARK_WAX} />
          <path d={TP_COUNTER} fill={MARK_CREAM} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
