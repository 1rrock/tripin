/**
 * `/login` 뼈대 — `src/app/(public)/login/page.tsx` + `LoginPanel` 의 미러.
 *
 * 모바일은 브레드크럼 · 큰 제목 · 한 줄 · 공급자 버튼 넷이 세로로 흐르고,
 * lg 부터 제목 단과 버튼 단(20rem)이 나란히 선다. 그 분기를 그대로 들고 간다.
 *
 * 공급자 버튼은 넷 다 `h-11` 로 높이가 박혀 있다 — 로그인 화면에서 자리가 흔들릴
 * 수 있는 곳은 위쪽 글 두 줄뿐이라, 뼈가 어긋나도 버튼 줄은 제자리에 선다.
 *
 * 브레드크럼은 `BoneCrumb` 을 쓰지 않는다 — 여기 것은 두 칸(홈 › 로그인)이고
 * 그 조각은 세 칸짜리다. 한 칸 차이가 그대로 가로 어긋남이 된다.
 */

import { Icon } from "@/shared/ui/icons";
import { Bone, BoneBlock, BoneRoot, times } from "./bones";

/** 구글 · 애플 · 카카오 · 네이버 */
const PROVIDERS = 4;

export function LoginSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4 lg:max-w-5xl lg:pt-8"
    >
      <nav className="index flex items-center gap-1.5 lg:hidden" style={{ color: "var(--dim)" }}>
        <span>
          <Bone w="2rem" />
        </span>
        <Icon.chevron className="size-2.5" />
        <span>
          <Bone w="2.5rem" />
        </span>
      </nav>

      <div className="flex flex-col gap-(--block) lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-16 lg:pt-4">
        <div className="lg:pt-1">
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
          >
            <Bone w="7rem" />
          </h1>
          {/* 안내는 실제로 두 줄까지 간다("다른 기기에서도 이어서 보려면…").
              두 줄을 한 <p> 안에서 흘리지 않고 block 으로 끊는다 — 인라인 뼈는
              폭이 남으면 같은 줄에 붙어서 두 줄이 한 줄로 접힌다. */}
          <p className="mt-2 max-w-md" style={{ fontSize: "var(--t-body)" }}>
            <span className="block">
              <Bone w="100%" />
            </span>
            <span className="block">
              <Bone w="62%" />
            </span>
          </p>
        </div>

        <section className="flex w-full flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {times(PROVIDERS).map((i) => (
              <li key={i}>
                <BoneBlock h={44} radius="var(--r-control)" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BoneRoot>
  );
}
