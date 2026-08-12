import { ImageResponse } from "next/og";

/**
 * Apple touch icon — Slash coral (wax fill + ink slash).
 * satori 는 SVG stroke 가 불완전해서 회전 막대로 근사한다.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const wax = "#c9441a";
const ink = "#2a2118";

export default function AppleIcon() {
  // 68/512 * 180 ≈ 23.9
  const thickness = 24;
  // 대각 길이 (광학 inset 반영)
  const barLen = 132;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: wax,
        }}
      >
        <div
          style={{
            width: barLen,
            height: thickness,
            background: ink,
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
