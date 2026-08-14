"use client";

/**
 * 헤더 통합 검색 — 채널·지역·종류·장소·영상을 한 자리에서.
 *
 * 왜 필요했나: 유입이 SEO 중심이라 대부분 `/c/곽튜브/도쿄` 같은 깊은 페이지로
 * 들어오는데 거기엔 검색이 없었다. 있던 두 곳(홈·채널 허브)도 **영상만** 찾아서,
 * "도쿄"를 쳐도 도쿄 지도를, "곽튜브"를 쳐도 그 채널을 제안하지 못했다.
 * 가장 좋은 답이 검색으로 도달 불가였다 — 그걸 `대표 결과`가 맨 위로 올린다.
 *
 * 색인은 **처음 열 때 한 번** 받는다(`/api/search-index`). 모든 페이지에 14KB 를
 * 얹으면 검색을 안 쓰고 나가는 대다수에게 세금을 매기는 셈이다.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { Avatar } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
import { thumbSmall } from "@/shared/lib/youtube";
import { highlight, search, type SearchDoc, type SearchKind } from "@/shared/lib/search";

export function SearchBar() {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const onHome = stripLocalePrefix(pathname) === "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchDoc[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  // 색인은 처음 열 때 한 번만. 실패해도 조용히 둔다 — 검색이 안 될 뿐 화면은 멀쩡하다
  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    fetch(`/api/search-index?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((docs: SearchDoc[]) => {
        if (alive) setIndex(docs);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, index, locale]);

  const results = useMemo(
    () => (index ? search(index, query) : { top: null, groups: [] }),
    [index, query],
  );

  // 빈손으로 나간 검색어를 남긴다 — 무슨 말로 찾다가 못 찾았는지가 다음 수집의
  // 우선순위 신호다(/admin/search-misses). 홈 검색이 헤더로 옮겨 오면서 함께 왔다.
  // 1.2초 머문 질의만, 마운트당 한 번씩. 타이핑 중간 글자("라멘ㅋ")는 남기지 않는다.
  const reported = useRef(new Set<string>());
  const missed = Boolean(index) && query.trim().length > 0 && !results.top;
  useEffect(() => {
    const needle = query.trim().toLowerCase();
    if (!missed || reported.current.has(needle)) return;
    const timer = setTimeout(() => {
      reported.current.add(needle);
      void fetch("/api/search-miss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: needle }),
        keepalive: true,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [missed, query]);

  /** 키보드 이동용 평평한 목록 — 화면 순서와 같아야 한다 */
  const flat = useMemo(
    () => (results.top ? [results.top, ...results.groups.flatMap((g) => g.docs)] : []),
    [results],
  );

  const go = useCallback(
    (doc: SearchDoc) => {
      close();
      const bare = stripLocalePrefix(pathname ?? "/");
      const desktop =
        typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
      const onHome = bare === "/";
      /* 지도를 품은 화면은 이제 `/map` 하나다 — 검색 결과를 페이지 이동 대신
         현재 지도의 필터로 꽂을 수 있는 곳. `/type` 은 홈으로 접혔고
         `/channels` 는 목록이라 여기 들어오지 않는다 */
      const onCanvas = bare === "/map";
      const mapFilter =
        doc.kind === "city" || doc.kind === "channel" || doc.kind === "type";
      if (onHome && mapFilter) {
        const params = new URLSearchParams();
        if (doc.kind === "city") {
          const slug = doc.path.split("/").pop();
          if (slug) params.set("city", slug);
        } else if (doc.kind === "channel") {
          const slug = doc.path.split("/")[2];
          if (slug) params.set("channel", slug);
        } else if (doc.kind === "type") {
          const key = doc.path.split("/").pop();
          if (key) params.set("type", key);
        }
        const qs = params.toString();
        router.push(qs ? `${href("/map")}?${qs}` : href("/map"));
        return;
      }
      if (onCanvas && desktop) {
        const params = new URLSearchParams();
        if (doc.kind === "city") {
          const slug = doc.path.split("/").pop();
          if (slug) params.set("city", slug);
        } else if (doc.kind === "channel") {
          const slug = doc.path.split("/")[2];
          if (slug) params.set("channel", slug);
        } else if (doc.kind === "type") {
          const key = doc.path.split("/").pop();
          if (key) params.set("type", key);
        } else {
          params.set("q", doc.name);
        }
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        return;
      }
      router.push(href(doc.path));
    },
    [close, href, router, pathname],
  );

  // 홈 본문 검색 바가 같은 패널을 연다
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("tripin:open-search", onOpen);
    return () => window.removeEventListener("tripin:open-search", onOpen);
  }, []);

  // 전역 단축키. ⚠️ 이펙트 안에서 인라인 화살표를 의존성으로 두지 않는다 —
  // 리렌더마다 리스너가 갈리며 포커스를 뺏겼던 전례가 있다(HANDOFF §1-3)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 열리면 입력에 포커스. 뒤 화면은 스크롤을 멈춘다
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /** 질의가 바뀌면 커서는 맨 위로. 이펙트가 아니라 여기서 함께 바꾼다 —
      이펙트로 미루면 한 프레임 동안 옛 커서가 엉뚱한 줄을 가리킨다 */
  const onQuery = (value: string) => {
    setQuery(value);
    setCursor(0);
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && flat[cursor]) {
      e.preventDefault();
      go(flat[cursor]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={m.search.open}
        aria-keyshortcuts="Meta+K Control+K /"
        /* 모바일은 오른쪽 끝의 **맨 돋보기** — 브랜드 옆 왼손 자리는 폰에서
           뒤로가기·햄버거의 자리지 검색의 자리가 아니고, 아이콘 하나를 담으려고
           판을 깔면 헤더에 이유 없는 상자가 하나 생긴다. 판이 없으니 잉크는
           --paper 로 올린다(--dim 이면 맨 아이콘이 너무 묽다).
           md 부터는 브랜드와 내비 사이를 채우는 입력창 모양으로 돌아온다 */
        /* -mr-2 는 max-md 로 못 박는다 — md 의 mx-auto 와 같은 속성을 다투게 두면
           어느 쪽이 이기는지가 Tailwind 유틸 출력 순서에 달리고, 그러면 데스크톱
           가운데 정렬이 조용히 깨질 수 있다 */
        className={`ml-auto flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-(--r-control) p-2 text-paper transition-[background-color,box-shadow] duration-150 max-md:-mr-2 active:bg-(--hover) md:mx-auto md:w-full md:max-w-xl md:shrink md:justify-start md:bg-(--sheet) md:px-3.5 md:py-2.5 md:text-dim md:shadow-[inset_0_0_0_1px_var(--hairline)] md:hover:shadow-[inset_0_0_0_1px_var(--edge)]${onHome ? " max-md:hidden" : ""}`}
      >
        {/* 탭바 아이콘과 같은 22px. -mr-2 는 **광학 정렬**이다 — 타깃(40px)은 손가락
            때문에 아이콘보다 큰데, 그 상자의 오른쪽을 거터에 맞추면 아이콘 자체는
            거터보다 9px 안쪽에 서서 좌측 브랜드와 여백이 안 맞아 보인다.
            상자를 8px 당겨 **아이콘의** 오른쪽 끝을 거터에 세운다 */}
        <Icon.search className="size-[22px] shrink-0 md:size-[18px]" />
        <span className="hidden truncate md:inline" style={{ fontSize: "var(--t-body)" }}>
          {m.search.trigger}
        </span>
        <span
          className="index ml-auto hidden shrink-0 rounded-[3px] px-1.5 py-1 md:inline"
          style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}
        >
          ⌘K
        </span>
      </button>

      {/* 포털은 `open` 하나로 충분하다 — 패널은 클릭·단축키·커스텀 이벤트로만 열리고
          그 셋은 전부 하이드레이션 뒤에 온다. 서버 렌더와 첫 클라이언트 렌더에서
          `open` 은 언제나 false 라 `document.body` 를 건드릴 일이 없다.
          🔴 여기에 mounted 상태를 다시 붙이지 말 것 — 이펙트에서 setState 를 불러
             모든 페이지에 렌더를 한 번씩 더 얹는다(react-hooks/set-state-in-effect) */}
      {open
        ? createPortal(
        <div className="fixed inset-0 z-[80]" onKeyDown={onPanelKey}>
          <button
            type="button"
            aria-label={m.search.close}
            onClick={close}
            className="absolute inset-0 cursor-default"
            style={{ background: "rgb(42 33 24 / 0.34)" }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={m.search.open}
            className="rise-in absolute inset-0 flex flex-col bg-white sm:inset-auto sm:top-16 sm:left-1/2 sm:h-auto sm:w-[min(41rem,calc(100vw-1.75rem))] sm:-translate-x-1/2 sm:rounded-[10px]"
            style={{ boxShadow: "var(--lift), 0 0 0 1px var(--hairline)" }}
          >
            <div
              className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3.5"
              style={{ borderColor: "var(--hairline)" }}
            >
              {/* 폰에는 ESC 키가 없다. 키캡 모양 칩만 두면 "누르는 것"으로 안 읽히고,
                  패널이 전체화면이라 스크림도 못 누른다 — 닫을 방법이 사실상 없었다.
                  안드로이드·유튜브 검색과 같은 자리에 뒤로 화살표를 둔다.
                  size-11(44px)은 손가락 타깃 최소치 */}
              <button
                type="button"
                onClick={close}
                aria-label={m.search.close}
                className="-ml-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-(--r-control) transition-colors active:bg-(--hover) sm:hidden"
              >
                <Icon.back className="size-5" />
              </button>
              {/* 입력은 헤더 트리거와 같은 판 위에 앉는다 — 전역 왁스 포커스 링이
                  폭을 다 쓰는 입력에 걸리면 화면을 가로지르는 빨간 사각형이 된다.
                  판 자신이 테두리를 진하게 해서 포커스를 말한다(.field, globals.css) */}
              <div className="field flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
                <Icon.search
                  className="size-[18px] shrink-0"
                  style={{ color: "var(--dim)" }}
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  placeholder={m.search.placeholder}
                  aria-label={m.search.open}
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-autocomplete="list"
                  autoComplete="off"
                  enterKeyHint="search"
                  /* 16px 미만이면 iOS 가 포커스에서 화면을 확대한다 */
                  className="w-full min-w-0 bg-transparent outline-none placeholder:text-[color:var(--dim)]"
                  style={{ fontSize: "16px" }}
                />
              </div>
              {/* 키캡은 키가 있는 화면에서만 — 모바일에서는 위 뒤로 화살표가 이 일을 한다 */}
              <button
                type="button"
                onClick={close}
                aria-label={m.search.close}
                className="index hidden shrink-0 cursor-pointer rounded-[4px] px-1.5 py-1 sm:block"
                style={{ boxShadow: "inset 0 0 0 1px var(--hairline)", color: "var(--dim)" }}
              >
                ESC
              </button>
            </div>

            <div
              id={listId}
              role="listbox"
              aria-label={m.search.open}
              className="flex-1 overflow-y-auto overscroll-contain pb-2 sm:max-h-[min(62vh,32.5rem)]"
            >
              {!query.trim() ? (
                <p
                  className="px-4 py-4"
                  style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.75 }}
                >
                  {m.search.hint}
                </p>
              ) : !results.top ? (
                <p
                  className="px-4 py-8 text-center"
                  style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}
                >
                  {t(m.search.empty, { q: query.trim() })}
                </p>
              ) : (
                <>
                  <GroupHead label={m.search.top} wax />
                  <Row
                    doc={results.top}
                    query={query}
                    m={m}
                    lead
                    active={cursor === 0}
                    onPick={() => go(results.top!)}
                  />
                  {results.groups.map((g) => {
                    const offset = 1 + flatOffset(results.groups, g.kind);
                    return (
                      <div key={g.kind}>
                        <GroupHead label={`${m.search.kinds[g.kind]} ${g.total}`} />
                        {g.docs.map((doc, i) => (
                          <Row
                            key={`${doc.kind}-${doc.path}-${doc.name}`}
                            doc={doc}
                            query={query}
                            m={m}
                            active={cursor === offset + i}
                            onPick={() => go(doc)}
                          />
                        ))}
                        {g.total > g.docs.length ? (
                          <p
                            className="index px-4 py-2"
                            style={{ color: "var(--dim)" }}
                          >
                            {t(m.search.more, { n: g.total - g.docs.length })}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}

/** 이 그룹이 평평한 목록에서 몇 번째부터 시작하는가 — 키보드 커서 계산 */
function flatOffset(groups: { kind: SearchKind; docs: SearchDoc[] }[], kind: SearchKind): number {
  let n = 0;
  for (const g of groups) {
    if (g.kind === kind) break;
    n += g.docs.length;
  }
  return n;
}

function GroupHead({ label, wax = false }: { label: string; wax?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
      <span className="index" style={{ color: wax ? "var(--wax)" : "var(--dim)" }}>
        {label}
      </span>
      <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
    </div>
  );
}

function Row({
  doc,
  query,
  m,
  lead = false,
  active,
  onPick,
}: {
  doc: SearchDoc;
  query: string;
  m: ReturnType<typeof useLocale>["messages"];
  /** 대표 결과 — 한 단 크게, 테두리를 두른다 */
  lead?: boolean;
  active: boolean;
  onPick: () => void;
}) {
  const [before, hit, after] = highlight(doc.name, query);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={
        lead
          ? "mx-2.5 mt-1 flex w-[calc(100%-1.25rem)] cursor-pointer items-center gap-3 rounded-(--r-control) px-3.5 py-3 text-left"
          : "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left"
      }
      style={
        lead
          ? { background: "var(--ground)", boxShadow: "inset 0 0 0 1px var(--edge)" }
          : active
            ? { background: "var(--hover)" }
            : undefined
      }
    >
      <Glyph doc={doc} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate font-bold"
          style={{
            fontSize: lead ? "var(--t-title)" : "var(--t-body)",
            letterSpacing: "-0.015em",
          }}
        >
          {before}
          {hit ? <span style={{ color: "var(--wax)" }}>{hit}</span> : null}
          {after}
        </span>
        <span className="index mt-1 block truncate">
          {lead ? `${m.search.kinds[doc.kind]} · ${doc.sub}` : doc.sub}
        </span>
      </span>
    </button>
  );
}

/** 종류마다 다른 표식 — 채널은 아바타, 영상은 컷, 나머지는 아이콘 */
function Glyph({ doc }: { doc: SearchDoc }) {
  if (doc.kind === "video" && doc.youtubeId) {
    return (
      <span className="frame w-[62px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- 유튜브 CDN 원본 그대로 (Thumb.tsx 와 같은 이유) */}
        <img src={thumbSmall(doc.youtubeId)} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  if (doc.kind === "channel") {
    return (
      <Avatar initials={doc.name.slice(0, 1)} accent={doc.accent ?? "#888"} src={doc.avatarUrl} size={30} />
    );
  }
  // 종류(type)에 **채널 아이콘**이 붙어 있던 자리다. 내비·탭바가 종류에 쓰는
  // 꼬리표로 맞춘다. 도시는 지도, 개별 장소는 핀 — 둘이 같은 글리프면 구분이 죽는다
  const Mark = doc.kind === "city" ? Icon.map : doc.kind === "type" ? Icon.tag : Icon.pin;
  return (
    <span
      className="grid size-[30px] shrink-0 place-items-center rounded-(--r-frame)"
      style={{ boxShadow: "inset 0 0 0 1px var(--hairline)", color: "var(--dim)" }}
    >
      <Mark className="size-4" />
    </span>
  );
}
