import type { Metadata } from "next";
import Link from "next/link";
import { loadAccount } from "@/shared/api/account-server";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { IdentityCard } from "./IdentityCard";
import { SubscriptionList } from "./SubscriptionList";
import { DangerZone } from "./DangerZone";

/**
 * 마이페이지 — **게이트가 아니라 설정함이다.**
 *
 * 이 구분이 화면 구성 전체를 정한다. `PRODUCT.md` 원칙 5 "게이트는 없다" 와
 * `ROADMAP.md` "로그인 권유는 /saved 배너에서만" 은 그대로 살아 있다.
 * 여기 한 번도 안 들어와도 검색·지도·저장·구독이 전부 된다.
 *
 * 그럼 왜 만드는가 — **여기 말고 있을 데가 없는 것들이 있다:**
 *   · 로그아웃      공용·가족 기기에서 남의 저장 목록이 계속 보이면 안 된다
 *   · 탈퇴          개인정보보호법상 파기 의무
 *   · 구독한 채널   구독은 되는데 모아 볼 화면이 없었다
 *   · 로그인 진입점 `/saved` 는 저장이 0개면 배너를 안 그린다(page.tsx 의 early return).
 *                   새 기기로 옮겨온 사람은 정의상 0개라, 하필 로그인이 필요한
 *                   그 순간에 진입점이 사라졌다
 *
 * 프로필 이름·아바타는 두지 않는다. 커뮤니티를 안 하기로 했으므로
 * (`ROADMAP.md` "커뮤니티: 하지 않는다") 표시될 데가 없는 값을 물어보는 꼴이 된다.
 * 언어 설정도 없다 — `938e6d7` 에서 의도적으로 걷어내고 자동 감지만 남겼다.
 *
 * 색인하지 않는다 — 유저별 화면이라 크롤러에게 보일 것이 없다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return { title: m.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const view = await loadAccount();

  /* `/auth/callback` 이 실패를 여기 실어 보낸다. 클라이언트에서 useSearchParams 로
     읽지 않는 이유: 그러면 이 값이 하이드레이션 뒤에야 나타나서, 화면이 한 번
     "아무 문제 없음" 으로 그려졌다가 에러가 뒤늦게 튀어나온다. */
  const raw = (await searchParams).auth_error;
  const authError = Array.isArray(raw) ? raw[0] : raw;

  const notices = [
    { href: "/about", label: m.common.about },
    { href: "/policy", label: m.common.policy },
    { href: "/privacy", label: m.common.privacy },
    { href: "/takedown", label: m.common.takedown },
  ];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4 lg:max-w-3xl">
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{m.account.title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {m.account.title}
        </h1>
      </header>

      {/* 연결 상태 · 로그인 · 로그아웃. 구글에서 돌아온 뒤의 실패도 여기서 뜬다. */}
      <IdentityCard linked={view.linked} email={view.email} authError={authError} />

      {/* 저장 — 개수만 보여주고 목록은 /saved 에 맡긴다.
          같은 목록을 두 화면이 그리면 손볼 데가 둘이 된다. */}
      <section className="flex flex-col gap-2.5">
        <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.savedHeading}</h2>
        <div className="flex flex-col gap-2">
          <CountRow
            href={localePath("/saved/liked", locale)}
            label={m.account.savedPlaces}
            value={t(m.account.countPlaces, { n: view.savedCount })}
            glyph={
              <Icon.heart className="size-4 shrink-0" weight="fill" style={{ color: "var(--wax)" }} />
            }
          />
          <CountRow
            href={localePath("/saved", locale)}
            label={m.account.savedLists}
            value={t(m.account.countLists, { n: view.listCount })}
            glyph={<Icon.menu className="size-4 shrink-0" style={{ color: "var(--dim)" }} />}
          />
        </div>
      </section>

      {/* 구독한 채널 — 구독 자체는 예전부터 됐는데 모아 볼 화면이 없었다.
          제목·개수까지 통째로 클라이언트에 맡긴다: 개수를 여기(서버 값)서 그리면
          구독을 해제했을 때 줄은 사라지는데 "3개 채널" 은 그대로 남는다. */}
      <SubscriptionList creators={view.creators} channelsHref={localePath("/channels", locale)} />

      {/* 약관·정책 — 지금까지 푸터에만 있었다. 계정 화면에서 찾는 사람이 실제로 있다. */}
      <section className="flex flex-col gap-2.5">
        <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.noticeHeading}</h2>
        <div className="flex flex-col gap-2">
          {notices.map((n) => (
            <CountRow
              key={n.href}
              href={localePath(n.href, locale)}
              label={n.label}
              value=""
              glyph={<Icon.globe className="size-4 shrink-0" style={{ color: "var(--dim)" }} />}
            />
          ))}
        </div>
      </section>

      {/* 탈퇴. 세션이 아예 없으면 지울 것도 없으므로 그리지 않는다. */}
      {view.userId ? <DangerZone savedCount={view.savedCount} /> : null}
    </main>
  );
}

/** 한 줄짜리 이동 행 — 왼쪽 글리프+라벨, 오른쪽 값, 끝에 셰브런. */
function CountRow({
  href,
  label,
  value,
  glyph,
}: {
  href: string;
  label: string;
  value: string;
  glyph: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3.5 pr-3 pl-3.5 transition-colors active:opacity-70"
      style={{
        borderRadius: "var(--r-control)",
        boxShadow: "inset 0 0 0 1px var(--hairline)",
      }}
    >
      {glyph}
      <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
        {label}
      </span>
      {value ? (
        <span className="tnum shrink-0" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {value}
        </span>
      ) : null}
      <Icon.chevron className="size-3 shrink-0" style={{ color: "var(--dim)" }} />
    </Link>
  );
}
