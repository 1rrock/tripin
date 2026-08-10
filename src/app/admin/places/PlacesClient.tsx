"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
// ⚠️ `_lib/queries` 는 서버 전용(서비스 롤 클라이언트)이라 여기서 import 하지 않는다
import type { AdminPlaceRow } from "../_lib/shared";
import { hasSummary, isVagueAddress, PLACE_TYPE_LABEL as TYPE_LABEL } from "../_lib/shared";
import { deletePlaceById, togglePlacePublished } from "../actions";
import { Pill } from "../_ui/kit";

type SortKey = "name" | "source" | "creator" | "city";

/** 대시보드에서 넘어오는 `?missing=summary` 같은 딥링크를 초기 필터로 받는다. */
function useInitialFilters() {
  const q = useSearchParams();
  return {
    creator: q.get("creator") ?? "",
    city: q.get("city") ?? "",
    status: q.get("status") ?? "",
    type: q.get("type") ?? "",
    missing: q.get("missing") ?? "",
    flag: q.get("flag") ?? "",
  };
}

export function PlacesClient({ places }: { places: AdminPlaceRow[] }) {
  const init = useInitialFilters();
  const [q, setQ] = useState("");
  const [creator, setCreator] = useState(init.creator);
  const [city, setCity] = useState(init.city);
  const [status, setStatus] = useState(init.status);
  const [type, setType] = useState(init.type);
  const [missing, setMissing] = useState(init.missing);
  const [flag, setFlag] = useState(init.flag);
  const [sort, setSort] = useState<SortKey>("source");
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  /**
   * 삭제 2단계 확인 — 무장된 행의 id.
   *
   * 기존 어드민은 무장 상태를 풀어 주는 곳이 없어서, "정말 삭제"로 바뀐 행이
   * 다른 행을 만지는 동안에도 그대로 남아 오클릭 위험이 있었다.
   * 여기서는 행을 접거나 다른 행을 펼치면 함께 풀린다(`openRow` 참조).
   */
  const [armedId, setArmedId] = useState<string | null>(null);

  /** 행 펼치기/접기 — 무장 상태도 같이 초기화한다. */
  const openRow = (id: string | null) => {
    setOpen(id);
    setArmedId(null);
  };

  const creators = useMemo(
    () => [...new Set(places.map((p) => p.creatorSlug))].filter((s) => s !== "?").sort(),
    [places],
  );
  const cities = useMemo(
    () => [...new Set(places.map((p) => p.citySlug))].filter((s) => s !== "?").sort(),
    [places],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = places.filter((p) => {
      if (creator && p.creatorSlug !== creator) return false;
      if (city && p.citySlug !== city) return false;
      if (status === "candidate" && p.mapStatus !== "candidate") return false;
      if (status === "confirmed" && p.mapStatus !== "confirmed") return false;
      if (status === "published" && !p.isPublished) return false;
      if (status === "hidden" && p.isPublished) return false;
      if (type && p.placeType !== type) return false;
      if (missing === "summary" && hasSummary(p)) return false;
      if (missing === "coords" && p.lat !== null) return false;
      if (flag === "vague" && !isVagueAddress(p.address)) return false;
      if (flag === "hidden" && !(!p.isPublished && p.mapStatus === "confirmed")) return false;
      if (needle) {
        const hay = [p.name, p.nameLocal, p.address, p.slug, p.videoTitle]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: AdminPlaceRow, b: AdminPlaceRow) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      creator: (a, b) => a.creatorSlug.localeCompare(b.creatorSlug) || a.name.localeCompare(b.name),
      city: (a, b) => a.citySlug.localeCompare(b.citySlug) || a.name.localeCompare(b.name),
      // 오래된 소스가 위로 — 폐업 위험이 큰 것부터 보인다
      source: (a, b) => (a.sourceDate ?? "").localeCompare(b.sourceDate ?? ""),
    };
    return out.sort(by[sort]);
  }, [places, q, creator, city, status, type, missing, flag, sort]);

  const reset = () => {
    setQ("");
    setCreator("");
    setCity("");
    setStatus("");
    setType("");
    setMissing("");
    setFlag("");
  };
  const filtered = rows.length !== places.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          장소{" "}
          <span className="text-base font-normal text-neutral-500 tabular-nums">
            {filtered ? `${rows.length} / ${places.length}` : places.length}
          </span>
        </h1>
        <Link href="/admin/confirm" className="text-sm text-neutral-600 hover:text-neutral-900">
          + 손으로 넣기
        </Link>
      </div>

      {/* ── 필터 줄 ── */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·주소·영상 제목 검색"
          className="min-w-56 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        <Select value={creator} onChange={setCreator} label="채널" options={creators} />
        <Select value={city} onChange={setCity} label="도시" options={cities} />
        <Select
          value={status}
          onChange={setStatus}
          label="상태"
          options={["candidate", "confirmed", "published", "hidden"]}
          labels={{
            candidate: "검수 대기",
            confirmed: "확정",
            published: "공개",
            hidden: "비공개",
          }}
        />
        <Select
          value={type}
          onChange={setType}
          label="업종"
          options={Object.keys(TYPE_LABEL)}
          labels={TYPE_LABEL}
        />
        <Select
          value={missing || flag}
          onChange={(v) => {
            const isMissing = v === "summary" || v === "coords";
            setMissing(isMissing ? v : "");
            setFlag(isMissing ? "" : v);
          }}
          label="점검"
          options={["summary", "coords", "vague", "hidden"]}
          labels={{
            summary: "요약 없음",
            coords: "좌표 없음",
            vague: "주소 모호",
            hidden: "확정·비공개",
          }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="source">오래된 소스순</option>
          <option value="name">이름순</option>
          <option value="creator">채널순</option>
          <option value="city">도시순</option>
        </select>
        {filtered ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            초기화
          </button>
        ) : null}
      </div>

      {toast ? (
        <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{toast}</p>
      ) : null}

      {/* ── 목록 ── */}
      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">조건에 맞는 장소가 없습니다.</p>
        ) : (
          <ul>
            {rows.map((p) => {
              const expanded = open === p.id;
              return (
                <li key={p.id} className="border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => openRow(expanded ? null : p.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-neutral-900">{p.name}</span>
                        {p.nameLocal ? (
                          <span className="text-xs text-neutral-400">{p.nameLocal}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span>{p.creatorName}</span>
                        <span className="text-neutral-300">×</span>
                        <span>{p.cityName}</span>
                        <span className="text-neutral-300">·</span>
                        <span>
                          {TYPE_LABEL[p.placeType as keyof typeof TYPE_LABEL] ?? p.placeType}
                        </span>
                        {p.sourceDate ? (
                          <>
                            <span className="text-neutral-300">·</span>
                            <span className="tabular-nums">{p.sourceDate.slice(0, 10)}</span>
                          </>
                        ) : null}
                      </span>
                    </button>

                    <span className="flex shrink-0 items-center gap-1.5">
                      {p.mapStatus === "candidate" ? <Pill tone="warn">검수 대기</Pill> : null}
                      {!hasSummary(p) ? <Pill tone="warn">요약 없음</Pill> : null}
                      {p.lat === null ? <Pill tone="danger">좌표 없음</Pill> : null}
                      {isVagueAddress(p.address) ? <Pill tone="warn">주소 모호</Pill> : null}
                      {p.isPublished ? <Pill tone="ok">공개</Pill> : <Pill tone="muted">비공개</Pill>}
                    </span>
                  </div>

                  {expanded ? (
                    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
                      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                        <Row label="슬러그">
                          <code className="text-xs">{p.slug}</code>
                        </Row>
                        <Row label="좌표">
                          {p.lat !== null
                            ? `${p.lat.toFixed(5)}, ${p.lng?.toFixed(5)}`
                            : "—"}
                        </Row>
                        <Row label="주소">{p.address ?? "—"}</Row>
                        <Row label="근거">{p.sourceNote ?? "—"}</Row>
                        <Row label="출처 영상">
                          {p.youtubeVideoId ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${p.youtubeVideoId}${
                                p.timestampSec ? `&t=${p.timestampSec}` : ""
                              }`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              {p.videoTitle ?? p.youtubeVideoId} ↗
                            </a>
                          ) : (
                            "—"
                          )}
                        </Row>
                        <Row label="지도">
                          {p.googleMapsUrl ? (
                            <a
                              href={p.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              구글 지도 ↗
                            </a>
                          ) : (
                            "—"
                          )}
                        </Row>
                      </dl>

                      {p.summaryBullets.length > 0 ? (
                        <ul className="mt-3 space-y-0.5 border-t border-neutral-200 pt-3 text-neutral-700">
                          {p.summaryBullets.map((b, i) => (
                            <li key={i}>· {b}</li>
                          ))}
                        </ul>
                      ) : null}
                      {p.priceHint ? (
                        <p className="mt-1.5 text-xs text-neutral-500">가격: {p.priceHint}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
                        <Link
                          href={`/admin/place/${p.id}`}
                          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
                        >
                          요약 편집
                        </Link>
                        {p.mapStatus === "confirmed" || p.isPublished ? (
                          <button
                            type="button"
                            disabled={pending}
                            title={
                              p.mapStatus !== "confirmed"
                                ? "후보 장소는 확정 후에만 공개할 수 있습니다"
                                : undefined
                            }
                            onClick={() =>
                              start(async () => {
                                const r = await togglePlacePublished(p.id, !p.isPublished);
                                setToast(r.ok ?? r.error ?? null);
                              })
                            }
                            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
                          >
                            {p.isPublished ? "비공개로" : "공개로"}
                          </button>
                        ) : null}
                        <a
                          href={`/c/${p.creatorSlug}/${p.citySlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
                        >
                          공개 화면 ↗
                        </a>

                        {/* 삭제는 오른쪽 끝에 따로 — 공개/편집과 같은 무게로 보이면 안 된다 */}
                        <span className="ml-auto flex items-center gap-2">
                          {armedId === p.id ? (
                            <>
                              <span className="text-xs text-red-700">되돌릴 수 없습니다.</span>
                              <button
                                type="button"
                                onClick={() => setArmedId(null)}
                                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                  start(async () => {
                                    const r = await deletePlaceById(p.id);
                                    setToast(r.ok ?? r.error ?? null);
                                    setArmedId(null);
                                    setOpen(null);
                                  })
                                }
                                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                정말 삭제
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setArmedId(p.id)}
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              삭제
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-xs text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-neutral-800">{children}</dd>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border px-2 py-1.5 text-sm ${
        value ? "border-neutral-500 bg-neutral-50 font-medium" : "border-neutral-300"
      }`}
    >
      <option value="">{label} 전체</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}
