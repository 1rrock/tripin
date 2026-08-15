import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 그룹 엽서 — 16:9 프레임을 최대 두 장 겹친다.
 *
 * 각 장은 자기 비율을 유지한다. 오프셋은 프레임을 옮길 뿐 컷을 자르지 않는다.
 */
export function CutStack({
  cuts,
}: {
  cuts: { youtubeId: string; alt: string }[];
}) {
  if (cuts.length === 0) {
    return <span className="frame" />;
  }

  if (cuts.length === 1) {
    return (
      <Frame>
        <Thumb youtubeId={cuts[0].youtubeId} alt={cuts[0].alt} />
      </Frame>
    );
  }

  return (
    <span className="relative block aspect-video">
      <span className="frame w-[88%]" style={{ position: "absolute", bottom: 0, left: 0 }}>
        <Thumb youtubeId={cuts[1].youtubeId} alt={cuts[1].alt} />
      </span>
      <span
        className="frame w-[88%]"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          boxShadow: "0 0 0 2px var(--ground), var(--lift)",
        }}
      >
        <Thumb youtubeId={cuts[0].youtubeId} alt={cuts[0].alt} eager />
      </span>
    </span>
  );
}
