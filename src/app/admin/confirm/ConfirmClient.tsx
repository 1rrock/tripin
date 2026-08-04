"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, Creator, MapStatus, PlaceType, Video } from "@/shared/api/database.types";
import { mapLinks } from "@/shared/lib/map-links";
import { MapView, type MapPin } from "@/shared/ui/MapView";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";
import {
  createCity,
  createCreator,
  createPlace,
  createVideo,
  deletePlace,
  updatePlace,
  type ActionResult,
} from "./actions";

export interface PieceRow {
  id: string;
  slug: string;
  name: string;
  name_local: string | null;
  place_type: PlaceType;
  map_status: MapStatus;
  lat: number | null;
  lng: number | null;
  address: string | null;
  source_note: string | null;
  summary: string | null;
  summary_bullets: string[];
  city_id: string;
  cityName: string;
  google_place_id: string | null;
  google_maps_url: string | null;
  kakao_place_id: string | null;
  naver_place_id: string | null;
  videoTitle: string;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 리스트에서 한눈에 보여야 하는 미완성 항목.
 * 좌표가 없으면 지도에 핀이 아예 안 뜨고, 요약이 없으면 공개 카드가 빈 채로 나간다.
 * 요약은 공개 화면(Explorer)이 불릿 → 문단 순으로 폴백하므로 둘 다 비었을 때만 누락이다.
 */
function missingParts(row: PieceRow): string[] {
  const parts: string[] = [];
  if (row.lat === null || row.lng === null) parts.push("좌표");
  if (!row.summary?.trim() && row.summary_bullets.length === 0) parts.push("요약");
  return parts;
}

const MISSING_BADGE_CLS: Record<string, string> = {
  좌표: "bg-red-100 text-red-900",
  요약: "bg-amber-100 text-amber-900",
};

function MissingBadges({ row }: { row: PieceRow }) {
  const parts = missingParts(row);
  if (parts.length === 0) return null;
  return (
    <span className="flex shrink-0 gap-1">
      {parts.map((part) => (
        <span
          key={part}
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${MISSING_BADGE_CLS[part]}`}
        >
          {part} 없음
        </span>
      ))}
    </span>
  );
}

/** 핀/행 선택 시 뜨는 상세 카드 — 지도앱 딥링크(구글/카카오/네이버)와 영상 링크 포함. */
function PlaceInfoCard({
  row,
  onClose,
  onEdit,
}: {
  row: PieceRow;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const links = mapLinks({
    googleMapsUrl: row.google_maps_url,
    googlePlaceId: row.google_place_id,
    kakaoPlaceId: row.kakao_place_id,
    naverPlaceId: row.naver_place_id,
    lat: row.lat,
    lng: row.lng,
  });
  const appCls: Record<string, string> = {
    google: "bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-100",
    kakao: "bg-[#FEE500] text-neutral-900 hover:brightness-95",
    naver: "bg-[#03C75A] text-white hover:brightness-95",
  };
  return (
    <div className="mt-3 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">
            {row.name}
            {row.name_local ? (
              <span className="ml-1.5 font-normal text-neutral-500">{row.name_local}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {row.cityName} · {PLACE_TYPE_LABELS[row.place_type]} ·{" "}
            {row.map_status === "confirmed" ? "확정" : "위치 확인 중"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/admin/place/${row.id}`}
            className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            요약
          </Link>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
            >
              수정
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded px-2 py-0.5 text-sm text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900"
          >
            ✕
          </button>
        </div>
      </div>

      {missingParts(row).length > 0 ? (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
          {missingParts(row).join(" · ")} 미입력 — 수정에서 채워야 공개 카드가 온전해집니다.
        </p>
      ) : null}

      <dl className="mt-2 space-y-1 text-sm text-neutral-700">
        {row.address ? <dd>주소: {row.address}</dd> : null}
        {row.lat !== null && row.lng !== null ? (
          <dd className="tabular-nums">
            좌표: {row.lat}, {row.lng}
          </dd>
        ) : null}
        {row.source_note ? <dd>근거: {row.source_note}</dd> : null}
        <dd>
          영상: {row.videoTitle}
          {row.timestampSec !== null ? ` · ${formatTs(row.timestampSec)} 언급` : ""}
        </dd>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.app + link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${appCls[link.app]}`}
          >
            {link.label}
          </a>
        ))}
        {row.youtubeVideoId ? (
          <a
            href={`https://www.youtube.com/watch?v=${row.youtubeVideoId}${row.timestampSec ? `&t=${row.timestampSec}s` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            영상 보기
          </a>
        ) : null}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";
const labelCls = "block text-xs font-medium text-neutral-600";
const buttonCls =
  "rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300";

function ResultNotice({ result }: { result: ActionResult }) {
  if (result.error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
        {result.error}
      </p>
    );
  }
  if (result.ok) {
    return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{result.ok}</p>;
  }
  return null;
}

/** 성공 시 폼을 비우는 래퍼 — 연속 입력 흐름 유지 (10초/건 목표). */
function useResettingForm(result: ActionResult) {
  const ref = useRef<HTMLFormElement>(null);
  const lastOk = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (result.ok && result.ok !== lastOk.current) {
      lastOk.current = result.ok;
      ref.current?.reset();
    }
  }, [result.ok]);
  return ref;
}

// ── 새 크리에이터 ──────────────────────────────────────

function CreatorForm() {
  const [result, action, pending] = useActionState(createCreator, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>이름</span>
          <input name="displayName" required placeholder="추성훈" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>슬러그</span>
          <input name="slug" required placeholder="chuseonghoon" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>채널 ID 또는 @핸들</span>
          <input
            name="youtubeChannelId"
            required
            placeholder="@Choosunghoon_ajossi"
            className={inputCls}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className={labelCls}>이니셜</span>
            <input name="initials" required maxLength={3} placeholder="추" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>컬러</span>
            <input
              name="accentColor"
              type="color"
              defaultValue="#2563eb"
              className="h-9 w-full cursor-pointer rounded-md border border-neutral-300 bg-white"
            />
          </label>
        </div>
      </div>
      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "크리에이터 만들기"}
      </button>
    </form>
  );
}

// ── 새 도시 ────────────────────────────────────────────

function CityForm() {
  const [result, action, pending] = useActionState(createCity, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>이름(한글)</span>
          <input name="name" required placeholder="도쿄" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>영문명</span>
          <input name="nameEn" required placeholder="Tokyo" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>슬러그</span>
          <input name="slug" required placeholder="tokyo" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>국가 코드</span>
          <input name="countryCode" required maxLength={2} placeholder="JP" className={inputCls} />
        </label>
      </div>
      <label>
        <span className={labelCls}>중심 좌표 (위도, 경도)</span>
        <input name="latlng" required placeholder="35.6812, 139.7671" className={inputCls} />
      </label>
      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "도시 만들기"}
      </button>
    </form>
  );
}

// ── 새 영상 ────────────────────────────────────────────

function VideoForm({ creatorId }: { creatorId: string }) {
  const [result, action, pending] = useActionState(createVideo, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <input type="hidden" name="creatorId" value={creatorId} />
      <label>
        <span className={labelCls}>YouTube URL</span>
        <input
          name="url"
          required
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputCls}
        />
      </label>
      <label>
        <span className={labelCls}>제목</span>
        <input name="title" required placeholder="워뇨 추천 도쿄 돈카츠" className={inputCls} />
      </label>
      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "영상 등록"}
      </button>
    </form>
  );
}

// ── 장소 입력 ──────────────────────────────────────────

function PlaceForm({
  creator,
  city,
  videos,
}: {
  creator: Creator;
  city: City;
  videos: Video[];
}) {
  const [result, action, pending] = useActionState(createPlace, {});
  const ref = useResettingForm(result);
  // 확정 잠금: 좌표+근거가 채워져야 확정 라디오가 열린다.
  // 입력은 uncontrolled 로 두고 폼 레벨 onChange 에서 DOM 값을 읽는다 —
  // effect 에서 setState 로 리셋하는 패턴(react-hooks/set-state-in-effect)을 피하기 위함.
  const [canConfirm, setCanConfirm] = useState(false);

  const syncConfirmLock = (form: HTMLFormElement) => {
    const latlng = (form.elements.namedItem("latlng") as HTMLInputElement | null)?.value ?? "";
    const google = (form.elements.namedItem("googleMaps") as HTMLInputElement | null)?.value ?? "";
    const note = (form.elements.namedItem("sourceNote") as HTMLInputElement | null)?.value ?? "";
    // 좌표가 없어도 구글 공유 링크가 있으면 저장 시 서버가 좌표를 자동 해석한다
    setCanConfirm((latlng.trim().length > 0 || google.trim().length > 0) && note.trim().length > 0);
  };

  return (
    <form
      ref={ref}
      action={action}
      onChange={(e) => syncConfirmLock(e.currentTarget)}
      onReset={() => setCanConfirm(false)}
      className="space-y-3"
    >
      <input type="hidden" name="creatorId" value={creator.id} />
      <input type="hidden" name="cityId" value={city.id} />
      <input type="hidden" name="countryCode" value={city.country_code} />

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>장소 이름 *</span>
          <input name="name" required placeholder="돈카츠 마루시치" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>원어 이름</span>
          <input name="nameLocal" placeholder="とんかつ まるしち" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>슬러그 *</span>
          <input name="slug" required placeholder="marushichi-tonkatsu" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>타입 *</span>
          <select name="placeType" defaultValue="restaurant" className={inputCls}>
            {Object.entries(PLACE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>좌표 (위도, 경도) — 오픈 데이터셋/OSM 에서 복사</span>
          <input name="latlng" placeholder="35.6812, 139.7671" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>주소</span>
          <input name="address" placeholder="고토구 스미요시 …" className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>출처 영상 *</span>
          <select name="videoId" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              영상 선택 — 출처 없는 장소는 공개 불가
            </option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>언급 타임스탬프</span>
          <input name="timestamp" placeholder="12:40" className={inputCls} />
        </label>
      </div>

      <label>
        <span className={labelCls}>
          구글 지도 공유 링크 — 가게 페이지에서 공유 → 링크 복사 (또는 place_id)
        </span>
        <input name="googleMaps" placeholder="https://maps.app.goo.gl/…" className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>카카오 장소 링크 또는 ID</span>
          <input name="kakaoPlace" placeholder="place.map.kakao.com/… 또는 ID" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>네이버 장소 링크 또는 ID</span>
          <input name="naverPlace" placeholder="map.naver.com/p/entry/place/… 또는 ID" className={inputCls} />
        </label>
      </div>

      <label>
        <span className={labelCls}>확정 근거 — 영상 속 간판 / 지역 언급 / 타임스탬프</span>
        <input
          name="sourceNote"
          placeholder='자막에 "고토구" 언급 (12:31)'
          className={inputCls}
        />
      </label>

      <fieldset className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="mapStatus"
            value="confirmed"
            disabled={!canConfirm}
            defaultChecked={false}
          />
          <span className={canConfirm ? "text-neutral-900" : "text-neutral-400"}>
            확정 {canConfirm ? "" : "(좌표 또는 구글 링크 + 근거 필요)"}
          </span>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-neutral-900">
          <input type="radio" name="mapStatus" value="candidate" defaultChecked />
          보류 — 위치 확인 중
        </label>
      </fieldset>

      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "저장 후 다음"}
      </button>
    </form>
  );
}

// ── 장소 수정 ──────────────────────────────────────────

/** 기존 장소 수정 폼 — 후보 검수 → 확정 승격의 핵심 경로. 값은 row 로 프리필. */
function PlaceEditForm({
  row,
  creatorId,
  onDone,
}: {
  row: PieceRow;
  creatorId: string;
  onDone: () => void;
}) {
  const [result, action, pending] = useActionState(updatePlace, {});
  // 프리필 값 기준으로 확정 잠금 초기화 — 좌표(또는 구글 링크)·근거가 있으면 바로 확정 가능
  const [canConfirm, setCanConfirm] = useState(
    ((row.lat !== null && row.lng !== null) || !!row.google_maps_url) && !!row.source_note,
  );
  const doneRef = useRef(false);

  useEffect(() => {
    if (result.ok && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [result.ok, onDone]);

  const syncConfirmLock = (form: HTMLFormElement) => {
    const latlng = (form.elements.namedItem("latlng") as HTMLInputElement | null)?.value ?? "";
    const google = (form.elements.namedItem("googleMaps") as HTMLInputElement | null)?.value ?? "";
    const note = (form.elements.namedItem("sourceNote") as HTMLInputElement | null)?.value ?? "";
    // 좌표가 없어도 구글 공유 링크가 있으면 저장 시 서버가 좌표를 자동 해석한다
    setCanConfirm((latlng.trim().length > 0 || google.trim().length > 0) && note.trim().length > 0);
  };

  return (
    <form
      action={action}
      onChange={(e) => syncConfirmLock(e.currentTarget)}
      className="mt-3 space-y-3 rounded-lg border border-neutral-300 bg-white p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">
          &ldquo;{row.name}&rdquo; 수정
        </h3>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          취소
        </button>
      </div>
      <input type="hidden" name="placeId" value={row.id} />
      <input type="hidden" name="creatorId" value={creatorId} />
      <input type="hidden" name="cityId" value={row.city_id} />

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>장소 이름 *</span>
          <input name="name" required defaultValue={row.name} className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>원어 이름</span>
          <input name="nameLocal" defaultValue={row.name_local ?? ""} className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>타입 *</span>
          <select name="placeType" defaultValue={row.place_type} className={inputCls}>
            {Object.entries(PLACE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>언급 타임스탬프</span>
          <input
            name="timestamp"
            defaultValue={row.timestampSec !== null ? formatTs(row.timestampSec) : ""}
            placeholder="12:40"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>좌표 (위도, 경도)</span>
          <input
            name="latlng"
            defaultValue={row.lat !== null && row.lng !== null ? `${row.lat}, ${row.lng}` : ""}
            placeholder="35.6812, 139.7671"
            className={inputCls}
          />
        </label>
        <label>
          <span className={labelCls}>주소</span>
          <input name="address" defaultValue={row.address ?? ""} className={inputCls} />
        </label>
      </div>

      <label>
        <span className={labelCls}>구글 지도 공유 링크 (또는 place_id)</span>
        <input
          name="googleMaps"
          defaultValue={row.google_maps_url ?? row.google_place_id ?? ""}
          placeholder="https://maps.app.goo.gl/…"
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelCls}>카카오 장소 링크 또는 ID</span>
          <input
            name="kakaoPlace"
            defaultValue={row.kakao_place_id ?? ""}
            placeholder="place.map.kakao.com/… 또는 ID"
            className={inputCls}
          />
        </label>
        <label>
          <span className={labelCls}>네이버 장소 링크 또는 ID</span>
          <input
            name="naverPlace"
            defaultValue={row.naver_place_id ?? ""}
            placeholder="map.naver.com/p/entry/place/… 또는 ID"
            className={inputCls}
          />
        </label>
      </div>

      <label>
        <span className={labelCls}>확정 근거 — 영상 속 간판 / 지역 언급 / 타임스탬프</span>
        <input
          name="sourceNote"
          defaultValue={row.source_note ?? ""}
          placeholder='자막에 "고토구" 언급 (12:31)'
          className={inputCls}
        />
      </label>

      <fieldset className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="mapStatus"
            value="confirmed"
            disabled={!canConfirm}
            defaultChecked={row.map_status === "confirmed"}
          />
          <span className={canConfirm ? "text-neutral-900" : "text-neutral-400"}>
            확정 {canConfirm ? "" : "(좌표 또는 구글 링크 + 근거 필요)"}
          </span>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-neutral-900">
          <input
            type="radio"
            name="mapStatus"
            value="candidate"
            defaultChecked={row.map_status !== "confirmed"}
          />
          보류 — 위치 확인 중
        </label>
      </fieldset>

      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "수정 저장"}
      </button>
    </form>
  );
}

// ── 장소 목록 ──────────────────────────────────────────

function PieceList({
  rows,
  creatorId,
  cityId,
  selectedId,
  onSelect,
}: {
  rows: PieceRow[];
  creatorId: string;
  cityId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [deleteResult, deleteAction] = useActionState(deletePlace, {});
  const [armedId, setArmedId] = useState<string | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const incompleteCount = rows.filter((r) => missingParts(r).length > 0).length;
  const visible = onlyIncomplete ? rows.filter((r) => missingParts(r).length > 0) : rows;
  const confirmed = visible.filter((r) => r.map_status === "confirmed");
  const candidates = visible.filter((r) => r.map_status !== "confirmed");

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        아직 장소가 없습니다. 왼쪽 폼으로 첫 장소를 넣으세요.
      </p>
    );
  }

  const renderRow = (row: PieceRow, index: number) => (
    <li
      key={row.id}
      className={`flex items-center gap-3 border-b border-neutral-100 py-2.5 last:border-0 ${
        row.id === selectedId ? "bg-neutral-50" : ""
      }`}
    >
      <span className="w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400">
        {index + 1}
      </span>
      <button type="button" onClick={() => onSelect(row.id)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-neutral-900">
          {row.name}
          {row.name_local ? (
            <span className="ml-1.5 font-normal text-neutral-500">{row.name_local}</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {PLACE_TYPE_LABELS[row.place_type]} · {row.videoTitle}
          {row.timestampSec !== null
            ? ` · ${Math.floor(row.timestampSec / 60)}:${String(row.timestampSec % 60).padStart(2, "0")}`
            : ""}
        </p>
      </button>
      <MissingBadges row={row} />
      {armedId === row.id ? (
        <form action={deleteAction} className="shrink-0">
          <input type="hidden" name="placeId" value={row.id} />
          <input type="hidden" name="creatorId" value={creatorId} />
          <input type="hidden" name="cityId" value={cityId} />
          <button
            type="submit"
            className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            정말 삭제
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setArmedId(row.id)}
          className="shrink-0 rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
        >
          삭제
        </button>
      )}
    </li>
  );

  return (
    <div>
      <ResultNotice result={deleteResult} />
      {incompleteCount > 0 ? (
        <label className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          <span>
            보완 필요 <strong className="font-semibold">{incompleteCount}</strong>건 — 좌표나 요약이
            빠진 장소만 보기
          </span>
        </label>
      ) : null}
      {confirmed.length > 0 || !onlyIncomplete ? (
        <>
          <h3 className="text-xs font-semibold text-neutral-500">확정 {confirmed.length}</h3>
          <ul>{confirmed.map(renderRow)}</ul>
        </>
      ) : null}
      {candidates.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-semibold text-neutral-500">
            위치 확인 중 {candidates.length}
          </h3>
          <ul className="opacity-70">{candidates.map(renderRow)}</ul>
        </>
      ) : null}
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          보완이 필요한 장소가 없습니다.
        </p>
      ) : null}
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────

export function ConfirmClient({
  creators,
  cities,
  videos,
  selectedCreator,
  selectedCity,
  rows,
}: {
  creators: Creator[];
  cities: City[];
  videos: Video[];
  selectedCreator: Creator | null;
  selectedCity: City | null;
  rows: PieceRow[];
}) {
  const router = useRouter();
  const [showCreatorForm, setShowCreatorForm] = useState(creators.length === 0);
  const [showCityForm, setShowCityForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  // 핀/행 선택 → 상세 카드 (조각 모드·브라우즈 모드 공용)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const selectedRow = rows.find((r) => r.id === selectedPlaceId) ?? null;
  // 상세 카드의 "수정" → 인라인 수정 폼
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const editingRow = rows.find((r) => r.id === editingPlaceId) ?? null;

  const selectPlace = (id: string | null) => {
    setSelectedPlaceId(id);
    setEditingPlaceId(null);
  };

  const toPins = (list: PieceRow[]): MapPin[] =>
    list
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r, i) => ({
        id: r.id,
        name: r.name,
        lat: r.lat!,
        lng: r.lng!,
        index: i + 1,
        accentColor: selectedCreator?.accent_color,
      }));

  const navigate = (creatorSlug: string | undefined, citySlug: string | undefined) => {
    const params = new URLSearchParams();
    if (creatorSlug) params.set("creator", creatorSlug);
    if (citySlug) params.set("city", citySlug);
    router.replace(`/admin/confirm?${params.toString()}`);
  };

  const pieceReady = selectedCreator && selectedCity;
  const confirmedCount = rows.filter((r) => r.map_status === "confirmed").length;
  const incompleteCount = rows.filter((r) => missingParts(r).length > 0).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">장소 확정</h1>
        {pieceReady ? (
          <p className="text-sm text-neutral-500">
            확정 <strong className="font-semibold text-neutral-900">{confirmedCount}</strong> / 공개
            기준 8
          </p>
        ) : null}
      </div>

      {/* 조각 선택 */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <label className="min-w-40">
          <span className={labelCls}>크리에이터</span>
          <select
            value={selectedCreator?.slug ?? ""}
            onChange={(e) => navigate(e.target.value || undefined, selectedCity?.slug)}
            className={inputCls}
          >
            <option value="">선택…</option>
            {creators.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-neutral-400">×</span>
        <label className="min-w-40">
          <span className={labelCls}>도시</span>
          <select
            value={selectedCity?.slug ?? ""}
            onChange={(e) => navigate(selectedCreator?.slug, e.target.value || undefined)}
            className={inputCls}
          >
            <option value="">선택…</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 pb-0.5 text-sm">
          <button
            type="button"
            onClick={() => setShowCreatorForm((v) => !v)}
            className="text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            + 크리에이터
          </button>
          <button
            type="button"
            onClick={() => setShowCityForm((v) => !v)}
            className="text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            + 도시
          </button>
        </div>
      </div>

      {showCreatorForm ? <CreatorForm /> : null}
      {showCityForm ? <CityForm /> : null}

      {pieceReady ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">장소 추가</h2>
              <button
                type="button"
                onClick={() => setShowVideoForm((v) => !v)}
                className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              >
                + 영상 등록
              </button>
            </div>
            {showVideoForm ? <VideoForm creatorId={selectedCreator.id} /> : null}
            {videos.length === 0 && !showVideoForm ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                이 크리에이터의 영상이 아직 없습니다. 먼저 위의 &ldquo;+ 영상 등록&rdquo;으로 출처
                영상을 넣으세요.
              </p>
            ) : null}
            <div className="mt-4">
              <PlaceForm creator={selectedCreator} city={selectedCity} videos={videos} />
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">
              {selectedCreator.display_name} × {selectedCity.name}
            </h2>
            {/* 유저 화면과 같은 MapView — 핀 클릭 시 상세 카드 + 지도앱 딥링크 */}
            <MapView
              className="mt-3 h-56 w-full"
              pins={toPins(rows.filter((r) => r.map_status === "confirmed"))}
              activeId={selectedPlaceId}
              onPinClick={selectPlace}
            />
            {editingRow ? (
              <PlaceEditForm
                row={editingRow}
                creatorId={selectedCreator.id}
                onDone={() => setEditingPlaceId(null)}
              />
            ) : selectedRow ? (
              <PlaceInfoCard
                row={selectedRow}
                onClose={() => selectPlace(null)}
                onEdit={() => setEditingPlaceId(selectedRow.id)}
              />
            ) : null}
            <div className="mt-3">
              <PieceList
                rows={rows}
                creatorId={selectedCreator.id}
                cityId={selectedCity.id}
                selectedId={selectedPlaceId}
                onSelect={selectPlace}
              />
            </div>
          </section>
        </div>
      ) : selectedCreator ? (
        /* ── 브라우즈 모드: 도시 미선택 → 이 크리에이터의 전 도시 핀 훑어보기 ── */
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">
              {selectedCreator.display_name} — 등록된 핀 전체{" "}
              <span className="font-normal text-neutral-400">
                (도시를 선택하면 조각 작업 모드로 전환)
              </span>
            </h2>
            <MapView
              className="mt-3 h-96 w-full"
              pins={toPins(rows)}
              activeId={selectedPlaceId}
              onPinClick={selectPlace}
            />
            {editingRow ? (
              <PlaceEditForm
                row={editingRow}
                creatorId={selectedCreator.id}
                onDone={() => setEditingPlaceId(null)}
              />
            ) : selectedRow ? (
              <PlaceInfoCard
                row={selectedRow}
                onClose={() => selectPlace(null)}
                onEdit={() => setEditingPlaceId(selectedRow.id)}
              />
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                핀을 클릭하면 상세 정보와 지도앱 링크가 뜹니다.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">
              장소 {rows.length}
              {incompleteCount > 0 ? (
                <span className="ml-2 font-normal text-amber-800">
                  · 보완 필요 {incompleteCount}
                </span>
              ) : null}
            </h2>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                아직 등록된 장소가 없습니다. 도시를 선택해 첫 장소를 넣으세요.
              </p>
            ) : (
              <ul className="mt-2">
                {rows.map((row, i) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectPlace(row.id)}
                      className={`flex w-full items-center gap-3 border-b border-neutral-100 py-2.5 text-left last:border-0 ${
                        row.id === selectedPlaceId ? "bg-neutral-50" : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900">
                          {row.name}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {row.cityName} · {PLACE_TYPE_LABELS[row.place_type]}
                          {row.map_status !== "confirmed" ? " · 위치 확인 중" : ""}
                        </span>
                      </span>
                      <MissingBadges row={row} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-neutral-500">
          크리에이터를 선택하면 등록된 핀을 볼 수 있고, 도시까지 선택하면 조각 작업이 시작됩니다.
        </p>
      )}
    </main>
  );
}
