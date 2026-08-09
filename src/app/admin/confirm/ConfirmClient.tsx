"use client";

/**
 * 손입력 — 파이프라인을 안 거치고 크리에이터·도시·영상·장소를 직접 넣는 화면.
 *
 * 예전에는 이 파일이 목록·지도·검수·수정까지 전부 들고 있었다(1,054줄).
 * 훑어보기는 `/admin/places`, 공개 판단은 `/admin/pieces`, 개별 수정은
 * `/admin/place/[id]` 로 갈라졌으므로 여기는 **새로 만드는 일**만 남긴다.
 *
 * 확정 잠금(좌표+근거 없이는 확정 불가)은 서버 액션(`actions.ts`)이 최종 검증하고,
 * 화면에서도 `StatusRadios` 로 한 번 더 막는다.
 */

import { useActionState, useState } from "react";
import Link from "next/link";
import { createCity, createCreator, createPlace, createVideo } from "./actions";
import {
  buttonCls,
  inputCls,
  labelCls,
  PLACE_TYPE_LABELS,
  readConfirmLock,
  ResultNotice,
  StatusRadios,
  useResettingForm,
} from "../_ui/form";

export interface Creator {
  id: string;
  slug: string;
  display_name: string;
}
export interface City {
  id: string;
  slug: string;
  name: string;
  country_code: string;
}
export interface Video {
  id: string;
  title: string;
  creator_id: string;
}

/** 접었다 펴는 보조 폼 — 자주 쓰지 않는 생성 작업을 기본으로 숨긴다. */
function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-neutral-800"
      >
        {label}
        <span className="text-neutral-400">{open ? "−" : "+"}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

function CreatorForm() {
  const [result, action, pending] = useActionState(createCreator, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
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
          <input name="youtubeChannelId" required placeholder="@jbkwak" className={inputCls} />
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
              className="mt-0.5 h-9 w-full cursor-pointer rounded-md border border-neutral-300 bg-white"
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

function CityForm() {
  const [result, action, pending] = useActionState(createCity, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
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

function VideoForm({ creatorId }: { creatorId: string }) {
  const [result, action, pending] = useActionState(createVideo, {});
  const ref = useResettingForm(result);
  return (
    <form ref={ref} action={action} className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <input type="hidden" name="creatorId" value={creatorId} />
      <label>
        <span className={labelCls}>YouTube URL</span>
        <input name="url" required placeholder="https://www.youtube.com/watch?v=…" className={inputCls} />
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

function PlaceForm({ creator, city, videos }: { creator: Creator; city: City; videos: Video[] }) {
  const [result, action, pending] = useActionState(createPlace, {});
  const ref = useResettingForm(result);
  const [canConfirm, setCanConfirm] = useState(false);

  return (
    <form
      ref={ref}
      action={action}
      onChange={(e) => setCanConfirm(readConfirmLock(e.currentTarget))}
      onReset={() => setCanConfirm(false)}
      className="space-y-3"
    >
      <input type="hidden" name="creatorId" value={creator.id} />
      <input type="hidden" name="cityId" value={city.id} />
      <input type="hidden" name="countryCode" value={city.country_code} />

      <div className="grid gap-2 sm:grid-cols-2">
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
        <label>
          <span className={labelCls}>출처 영상 * — 출처 없는 장소는 공개 불가</span>
          <select name="videoId" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              영상 선택
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
          구글 지도 공유 링크 — 가게 페이지에서 공유 → 링크 복사. 좌표를 자동 해석한다
        </span>
        <input name="googleMaps" placeholder="https://maps.app.goo.gl/…" className={inputCls} />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className={labelCls}>좌표 (위도, 경도) — 공유 링크가 있으면 비워도 된다</span>
          <input name="latlng" placeholder="35.6812, 139.7671" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>주소</span>
          <input name="address" placeholder="고토구 스미요시 …" className={inputCls} />
        </label>
      </div>

      <label>
        <span className={labelCls}>확정 근거 — 영상 속 간판 / 지역 언급 / 타임스탬프</span>
        <input name="sourceNote" placeholder='자막에 "고토구" 언급 (12:31)' className={inputCls} />
      </label>

      <StatusRadios canConfirm={canConfirm} confirmedDefault={false} />

      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "저장 후 다음"}
      </button>
    </form>
  );
}

export function ConfirmClient({
  creators,
  cities,
  videos,
}: {
  creators: Creator[];
  cities: City[];
  videos: Video[];
}) {
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");

  const creator = creators.find((c) => c.id === creatorId);
  const city = cities.find((c) => c.id === cityId);
  const creatorVideos = videos.filter((v) => v.creator_id === creatorId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">손입력</h1>
        <Link href="/admin/places" className="text-sm text-neutral-600 hover:text-neutral-900">
          장소 목록 →
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        스크립트(<code className="rounded bg-neutral-100 px-1">scripts/ingest/*</code>)를 안 쓰고
        직접 넣을 때 씁니다. 넣은 뒤에는 대시보드에서 <strong>통계 재계산</strong>을 누르세요.
      </p>

      {/* ── 대상 고르기 ── */}
      <div className="mt-6 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label>
          <span className={labelCls}>크리에이터</span>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className={inputCls}
          >
            {creators.length === 0 ? <option value="">없음 — 아래에서 만드세요</option> : null}
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>도시</span>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls}>
            {cities.length === 0 ? <option value="">없음 — 아래에서 만드세요</option> : null}
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── 장소 입력 (주 작업) ── */}
      <section className="mt-4 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">
          장소 추가
          {creator && city ? (
            <span className="ml-2 font-normal text-neutral-500">
              {creator.display_name} × {city.name}
            </span>
          ) : null}
        </h2>
        <div className="mt-3">
          {!creator || !city ? (
            <p className="rounded-md bg-neutral-50 px-3 py-6 text-center text-sm text-neutral-500">
              크리에이터와 도시를 먼저 만들어야 장소를 넣을 수 있습니다.
            </p>
          ) : creatorVideos.length === 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-6 text-center text-sm text-amber-900">
              이 채널에 등록된 영상이 없습니다. 아래 <strong>영상 등록</strong>을 먼저 하세요 —
              출처 없는 장소는 공개할 수 없습니다.
            </p>
          ) : (
            <PlaceForm creator={creator} city={city} videos={creatorVideos} />
          )}
        </div>
      </section>

      {/* ── 보조: 자주 안 쓰는 생성 ── */}
      <div className="mt-4 space-y-3">
        <Disclosure label="+ 영상 등록">
          {creatorId ? (
            <VideoForm creatorId={creatorId} />
          ) : (
            <p className="mt-3 text-sm text-neutral-500">크리에이터를 먼저 만드세요.</p>
          )}
        </Disclosure>
        <Disclosure label="+ 크리에이터 만들기">
          <CreatorForm />
        </Disclosure>
        <Disclosure label="+ 도시 만들기">
          <CityForm />
        </Disclosure>
      </div>
    </main>
  );
}
