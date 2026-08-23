"use client";

import { useActionState, useState } from "react";
import { updatePlace } from "../confirm/actions";
import {
  buttonCls,
  formatTs,
  inputCls,
  labelCls,
  PLACE_TYPE_LABELS,
  readConfirmLock,
  ResultNotice,
  StatusRadios,
} from "./form";

export interface EditablePlace {
  id: string;
  cityId: string;
  name: string;
  nameLocal: string | null;
  placeType: string;
  mapStatus: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  sourceNote: string | null;
  timestampSec: number | null;
}

/**
 * 장소 정보 수정 — 이름·타입·좌표·지도 링크·근거·확정 상태.
 *
 * 요약(불릿)은 같은 화면의 `SummaryEditor` 가 맡는다. 한 장소를 고치는 일이
 * 두 화면으로 갈라져 있던 걸 여기로 모았다.
 */
export function PlaceEditForm({
  place,
  creatorId,
}: {
  place: EditablePlace;
  creatorId: string;
}) {
  const [result, action, pending] = useActionState(updatePlace, {});
  const [canConfirm, setCanConfirm] = useState(
    ((place.lat !== null && place.lng !== null) || Boolean(place.googleMapsUrl)) &&
      Boolean(place.sourceNote),
  );

  return (
    <form
      action={action}
      onChange={(e) => setCanConfirm(readConfirmLock(e.currentTarget))}
      className="space-y-3"
    >
      <input type="hidden" name="placeId" value={place.id} />
      <input type="hidden" name="creatorId" value={creatorId} />
      <input type="hidden" name="cityId" value={place.cityId} />

      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className={labelCls}>장소 이름 *</span>
          <input name="name" required defaultValue={place.name} className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>원어 이름</span>
          <input name="nameLocal" defaultValue={place.nameLocal ?? ""} className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>타입 *</span>
          <select name="placeType" defaultValue={place.placeType} className={inputCls}>
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
            defaultValue={place.timestampSec !== null ? formatTs(place.timestampSec) : ""}
            placeholder="12:40"
            className={inputCls}
          />
        </label>
        <label>
          <span className={labelCls}>좌표 (위도, 경도)</span>
          <input
            name="latlng"
            defaultValue={
              place.lat !== null && place.lng !== null ? `${place.lat}, ${place.lng}` : ""
            }
            placeholder="35.6812, 139.7671"
            className={inputCls}
          />
        </label>
        <label>
          <span className={labelCls}>주소</span>
          <input name="address" defaultValue={place.address ?? ""} className={inputCls} />
        </label>
      </div>

      <label>
        <span className={labelCls}>구글 지도 공유 링크 (또는 place_id) — 좌표를 자동 해석한다</span>
        <input
          name="googleMaps"
          defaultValue={place.googleMapsUrl ?? place.googlePlaceId ?? ""}
          placeholder="https://maps.app.goo.gl/…"
          className={inputCls}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className={labelCls}>카카오 장소 링크 또는 ID</span>
          <input
            name="kakaoPlace"
            defaultValue={place.kakaoPlaceId ?? ""}
            placeholder="place.map.kakao.com/… 또는 ID"
            className={inputCls}
          />
        </label>
        <label>
          <span className={labelCls}>네이버 장소 링크 또는 ID</span>
          <input
            name="naverPlace"
            defaultValue={place.naverPlaceId ?? ""}
            placeholder="m.place.naver.com/…/{숫자}/… 또는 ID"
            className={inputCls}
          />
        </label>
      </div>

      <label>
        <span className={labelCls}>확정 근거 — 영상 속 간판 / 지역 언급 / 타임스탬프</span>
        <input
          name="sourceNote"
          defaultValue={place.sourceNote ?? ""}
          placeholder='자막에 "고토구" 언급 (12:31)'
          className={inputCls}
        />
      </label>

      <StatusRadios canConfirm={canConfirm} confirmedDefault={place.mapStatus === "confirmed"} />

      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "장소 정보 저장"}
      </button>
    </form>
  );
}
