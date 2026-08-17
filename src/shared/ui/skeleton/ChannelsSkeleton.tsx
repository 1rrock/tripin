/**
 * `/channels` 뼈대 — `src/app/(public)/channels/page.tsx` 의 미러.
 *
 * 구독 목록 문법: 큰 원형 프로필(64) + 이름 + `@핸들 · 지표` + 소개 두 줄.
 * 소개는 `line-clamp-2` 라 최대 두 줄이므로 뼈도 두 줄까지만 깐다.
 */

import { Bone, BoneBlock, BoneDot, BoneRoot, times } from "./bones";

const ROWS = 6;

export function ChannelsSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) pt-5 lg:max-w-3xl"
    >
      <header className="pb-2">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          <Bone w="3.5rem" />
        </h1>
      </header>

      <ul className="flex flex-col">
        {times(ROWS).map((i) => (
          <li key={i}>
            {i > 0 ? <hr className="rule" /> : null}
            {/* 구독 버튼은 행 링크 **밖**의 형제다(page.tsx) — 감싸는 줄을 빼면
                링크가 폭을 통째로 먹어서 이름·소개가 버튼 폭(36+8)만큼 오른쪽으로
                밀린 자리에 선다. 껍데기까지 같이 베낀다. */}
            <div className="flex items-start gap-2">
              <div className="-mx-2.5 flex min-w-0 flex-1 items-start gap-4 rounded-(--r-control) px-2.5 py-5">
                <BoneDot size={64} />

                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold tracking-[-0.02em] lg:text-lg">
                    <Bone w="8rem" />
                  </span>
                  <span
                    className="mt-1 block"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                  >
                    <Bone w="11rem" />
                  </span>
                  {/* 소개는 최대 두 줄(`line-clamp-2`)이지만 한 줄로 깐다 — 실제로는
                    도시 목록이 그 자리를 받고 대부분 한 줄에 끝난다(6채널 중 5개).
                    두 줄로 두면 행마다 21px 씩 밀려 목록 끝에서 104px 어긋났다 */}
                  <span
                    className="mt-1.5 block"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}
                  >
                    <Bone w="72%" />
                  </span>
                </span>
              </div>

              {/* 구독 버튼 — `h-9 px-3.5`, 라운드는 --r-frame. 폭은 재서 넣었다:
                  ko "구독" 이 51px. en "Subscribe" 는 더 넓지만 뼈에 로케일을
                  들이지 않는다 — 어긋나는 것은 옆 글단의 폭뿐이고 줄은 안 밀린다. */}
              <span className="shrink-0 self-center">
                <BoneBlock w="3.25rem" h={36} radius="var(--r-frame)" />
              </span>
            </div>
          </li>
        ))}
        <hr className="rule" />
      </ul>
    </BoneRoot>
  );
}
