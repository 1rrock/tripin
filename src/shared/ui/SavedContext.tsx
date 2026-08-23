"use client";

/**
 * 저장 상태를 화면 전체가 공유한다.
 *
 * 왜 컨텍스트인가: 하트 버튼이 각자 자기 상태를 조회하면 장소 20개짜리 목록에서
 * 요청이 20번 난다. 여기서 한 번 읽고 나눠준다.
 *
 * 낙관적 갱신을 한다 — 하트는 누른 즉시 켜져야 한다. 서버 왕복을 기다리면
 * 모바일에서 체감 지연이 그대로 보인다. 실패하면 되돌린다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createList,
  deleteList,
  EMPTY_SNAPSHOT,
  loadSaved,
  renameList,
  setInList,
  setSaved,
  setSubscribed,
  type ListMeta,
  type ListResult,
  type SavedSnapshot,
} from "@/shared/api/saved";

type Ctx = {
  ready: boolean;
  isSaved: (placeId: string) => boolean;
  isSubscribed: (creatorId: string) => boolean;
  savedCount: number;
  toggleSaved: (placeId: string) => Promise<void>;
  toggleSubscribed: (creatorId: string) => Promise<void>;

  /* 그룹 */
  lists: ListMeta[];
  listsOf: (placeId: string) => Set<string>;
  countIn: (listId: string) => number;
  addList: (name: string) => Promise<ListResult>;
  editList: (listId: string, name: string) => Promise<ListResult>;
  removeList: (listId: string) => Promise<void>;
  toggleInList: (listId: string, placeId: string) => Promise<void>;
};

const SavedContext = createContext<Ctx | null>(null);

/** Set 을 그대로 변형하면 리액트가 못 알아챈다. 매번 새 Set 을 만든다. */
function toggled(set: Set<string>, id: string, next: boolean): Set<string> {
  const copy = new Set(set);
  if (next) copy.add(id);
  else copy.delete(id);
  return copy;
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<SavedSnapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSaved()
      .then((s) => {
        if (alive) setSnap(s);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 최신 스냅샷을 **이벤트 콜백에서** 읽는 창구.
   *
   * 토글 함수가 `snap` 을 의존성으로 들면 하트 한 번에 네 함수의 신원이 전부
   * 바뀐다. 이 프로바이더는 루트 레이아웃에 있어서 그 파장이 모든 소비자
   * (SaveButton·ListPicker·SavedMapChips·TabDock·HomeCanvas·SavedIndex)로 간다.
   * 아래 useMemo 도 같이 무의미해진다.
   *
   * 렌더 중이 아니라 이펙트에서 넣는다(react-hooks/refs). 읽는 곳은 전부 사용자
   * 이벤트 핸들러라 커밋 뒤다 — MapView·HomeCanvas 의 ref 들과 같은 계약.
   */
  const snapRef = useRef(snap);
  useEffect(() => {
    snapRef.current = snap;
  });

  const toggleSavedCb = useCallback(
    async (placeId: string) => {
      const cur = snapRef.current;
      const next = !cur.places.has(placeId);
      /* 낙관적 갱신 — 하트는 누른 즉시 켜져야 한다.
         끌 때는 그룹 담김도 같이 비운다(setSaved 가 DB 에서도 같이 지운다). */
      const prevMembership = cur.membership.get(placeId);
      setSnap((s) => {
        const membership = new Map(s.membership);
        if (!next) membership.delete(placeId);
        return { ...s, places: toggled(s.places, placeId, next), membership };
      });

      const ok = await setSaved(placeId, next);
      if (!ok) {
        setSnap((s) => {
          const membership = new Map(s.membership);
          if (!next && prevMembership) membership.set(placeId, prevMembership);
          return { ...s, places: toggled(s.places, placeId, !next), membership };
        });
      }
    },
    [],
  );

  const toggleSubscribedCb = useCallback(
    async (creatorId: string) => {
      const next = !snapRef.current.creators.has(creatorId);
      setSnap((s) => ({ ...s, creators: toggled(s.creators, creatorId, next) }));

      const ok = await setSubscribed(creatorId, next);
      if (!ok) {
        setSnap((s) => ({ ...s, creators: toggled(s.creators, creatorId, !next) }));
      }
    },
    [],
  );

  const addListCb = useCallback(async (name: string) => {
    const res = await createList(name);
    if (res.ok) {
      /* 낙관적으로 넣지 않는다 — id 가 서버에서 오고, 이름 중복이면 실패한다.
         저장·하트와 달리 즉시성이 덜 중요하고 실패 경우가 실제로 있다. */
      setSnap((s) => ({
        ...s,
        lists: [...s.lists, { id: res.id, name: name.trim(), position: s.lists.length }],
      }));
    }
    return res;
  }, []);

  const editListCb = useCallback(async (listId: string, name: string) => {
    const res = await renameList(listId, name);
    if (res.ok) {
      setSnap((s) => ({
        ...s,
        lists: s.lists.map((l) => (l.id === listId ? { ...l, name: name.trim() } : l)),
      }));
    }
    return res;
  }, []);

  const removeListCb = useCallback(async (listId: string) => {
    /* 그룹만 지운다. 안에 있던 장소는 저장 목록에 그대로 남는다 —
       membership 에서만 뺀다. */
    setSnap((s) => {
      const membership = new Map(s.membership);
      for (const [placeId, ids] of membership) {
        if (!ids.has(listId)) continue;
        const copy = new Set(ids);
        copy.delete(listId);
        membership.set(placeId, copy);
      }
      return { ...s, lists: s.lists.filter((l) => l.id !== listId), membership };
    });
    await deleteList(listId);
  }, []);

  const toggleInListCb = useCallback(
    async (listId: string, placeId: string) => {
      const next = !(snapRef.current.membership.get(placeId)?.has(listId) ?? false);

      setSnap((s) => {
        const membership = new Map(s.membership);
        const ids = new Set(membership.get(placeId) ?? []);
        if (next) ids.add(listId);
        else ids.delete(listId);
        membership.set(placeId, ids);
        /* 그룹에 넣으면 저장도 같이 켠다 — setInList 가 DB 에서도 같이 넣는다 */
        return {
          ...s,
          membership,
          places: next ? toggled(s.places, placeId, true) : s.places,
        };
      });

      const ok = await setInList(listId, placeId, next);
      if (!ok) {
        setSnap((s) => {
          const membership = new Map(s.membership);
          const ids = new Set(membership.get(placeId) ?? []);
          if (next) ids.delete(listId);
          else ids.add(listId);
          membership.set(placeId, ids);
          return { ...s, membership };
        });
      }
    },
    [],
  );

  /**
   * 읽기 함수는 **자기가 실제로 읽는 조각만** 의존성으로 든다.
   *
   * 예전엔 넷 다 value 객체 안의 인라인 화살표였다. 그러면 어떤 이유로든 이
   * 컴포넌트가 다시 그려질 때마다 네 함수가 전부 새 신원을 얻는다. 그 신원을
   * memo 키로 쓰는 화면이 있다 — `/map` 의 `saved` → `filtered` → `pins` 가
   * 그것이고, 구독 토글 한 번에 1,845곳을 네 번 훑고 지도에 내용이 같은 새
   * 핀 배열을 밀어 넣었다(MapView 의 뷰포트 리스너가 그 자리에서 사라졌다).
   *
   * 이제 구독 토글은 `snap.creators` 만 바꾸므로 `isSaved`·`listsOf` 는 그대로다.
   * 하트 토글은 `snap.places` 를 바꾸니 `isSaved` 가 바뀌는데, 그건 저장 필터
   * (`?saved=1`·`?list=`)의 결과가 실제로 달라지기 때문에 **바뀌어야 맞다**.
   */
  const isSaved = useCallback((placeId: string) => snap.places.has(placeId), [snap.places]);
  const isSubscribed = useCallback(
    (creatorId: string) => snap.creators.has(creatorId),
    [snap.creators],
  );
  const listsOf = useCallback(
    (placeId: string) => snap.membership.get(placeId) ?? new Set<string>(),
    [snap.membership],
  );
  const countIn = useCallback(
    (listId: string) => {
      let n = 0;
      for (const ids of snap.membership.values()) if (ids.has(listId)) n += 1;
      return n;
    },
    [snap.membership],
  );

  /* value 를 객체 리터럴로 두면 이 컴포넌트의 모든 렌더가 컨텍스트 변경으로
     읽힌다 — 프로바이더가 루트 레이아웃에 있으니 화면 전체가 대상이다. */
  const value = useMemo<Ctx>(
    () => ({
      ready,
      isSaved,
      isSubscribed,
      savedCount: snap.places.size,
      toggleSaved: toggleSavedCb,
      toggleSubscribed: toggleSubscribedCb,
      lists: snap.lists,
      listsOf,
      countIn,
      addList: addListCb,
      editList: editListCb,
      removeList: removeListCb,
      toggleInList: toggleInListCb,
    }),
    [
      ready,
      isSaved,
      isSubscribed,
      snap.places,
      snap.lists,
      listsOf,
      countIn,
      toggleSavedCb,
      toggleSubscribedCb,
      addListCb,
      editListCb,
      removeListCb,
      toggleInListCb,
    ],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

/**
 * 프로바이더 밖에서도 터지지 않는다.
 *
 * PlaceSheet 는 지도·홈·채널 등 여러 트리에서 렌더된다. 하나라도 프로바이더 밖에
 * 있으면 throw 하는 훅은 그 화면을 통째로 죽인다. 저장은 부가 기능이므로
 * "동작하지 않음" 이 "화면이 안 뜸" 보다 낫다.
 */
export function useSaved(): Ctx {
  return useContext(SavedContext) ?? OUTSIDE_PROVIDER;
}

/* 모듈 스코프에 한 벌만 둔다 — 훅 안에서 리터럴로 만들면 프로바이더 밖 화면에서
   `isSaved` 신원이 매 렌더 바뀌어, 이걸 memo 키로 쓰는 쪽(/map)이 매 렌더 다시
   계산한다. 값이 전부 상수라 공유해도 위험이 없다. */
const OUTSIDE_PROVIDER: Ctx = {
  ready: false,
  isSaved: () => false,
  isSubscribed: () => false,
  savedCount: 0,
  toggleSaved: async () => {},
  toggleSubscribed: async () => {},
  lists: [],
  listsOf: () => new Set<string>(),
  countIn: () => 0,
  addList: async () => ({ ok: false, reason: "failed" }),
  editList: async () => ({ ok: false, reason: "failed" }),
  removeList: async () => {},
  toggleInList: async () => {},
};
