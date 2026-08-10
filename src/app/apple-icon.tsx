import { ImageResponse } from "next/og";

/**
 * Apple touch icon — GT monogram on ground.
 * satori 는 SVG path stroke 가 불완전해서 막대 조합으로 근사한다.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const paper = "#2a2118";
const wax = "#c9441a";
const ground = "#f0e8db";
const hair = "#ddd0bc";
const t = 14; // stroke weight ~40/512 * 180

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ground,
        }}
      >
        <div
          style={{
            width: 152,
            height: 152,
            display: "flex",
            position: "relative",
            border: `1px solid ${hair}`,
          }}
        >
          {/* G top */}
          <div style={{ position: "absolute", left: 28, top: 36, width: 58, height: t, background: paper }} />
          {/* G left */}
          <div style={{ position: "absolute", left: 28, top: 36, width: t, height: 80, background: paper }} />
          {/* G bottom */}
          <div style={{ position: "absolute", left: 28, top: 102, width: 58, height: t, background: paper }} />
          {/* G chin */}
          <div style={{ position: "absolute", left: 72, top: 68, width: t, height: 48, background: paper }} />
          {/* G spur */}
          <div style={{ position: "absolute", left: 48, top: 68, width: 38, height: t, background: paper }} />
          {/* T bar */}
          <div style={{ position: "absolute", left: 70, top: 36, width: 54, height: t, background: paper }} />
          {/* T stem wax */}
          <div style={{ position: "absolute", left: 98, top: 36, width: t, height: 80, background: wax }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
