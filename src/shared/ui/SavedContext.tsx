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

  const toggleSavedCb = useCallback(
    async (placeId: string) => {
      const next = !snap.places.has(placeId);
      /* 낙관적 갱신 — 하트는 누른 즉시 켜져야 한다.
         끌 때는 그룹 담김도 같이 비운다(setSaved 가 DB 에서도 같이 지운다). */
      const prevMembership = snap.membership.get(placeId);
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
    [snap.places],
  );

  const toggleSubscribedCb = useCallback(
    async (creatorId: string) => {
      const next = !snap.creators.has(creatorId);
      setSnap((s) => ({ ...s, creators: toggled(s.creators, creatorId, next) }));

      const ok = await setSubscribed(creatorId, next);
      if (!ok) {
        setSnap((s) => ({ ...s, creators: toggled(s.creators, creatorId, !next) }));
      }
    },
    [snap.creators],
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
      const next = !(snap.membership.get(placeId)?.has(listId) ?? false);

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
    [snap.membership],
  );

  return (
    <SavedContext.Provider
      value={{
        ready,
        isSaved: (id) => snap.places.has(id),
        isSubscribed: (id) => snap.creators.has(id),
        savedCount: snap.places.size,
        toggleSaved: toggleSavedCb,
        toggleSubscribed: toggleSubscribedCb,
        lists: snap.lists,
        listsOf: (placeId) => snap.membership.get(placeId) ?? new Set(),
        countIn: (listId) => {
          let n = 0;
          for (const ids of snap.membership.values()) if (ids.has(listId)) n += 1;
          return n;
        },
        addList: addListCb,
        editList: editListCb,
        removeList: removeListCb,
        toggleInList: toggleInListCb,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

/**
 * 프로바이더 밖에서도 터지지 않는다.
 *
 * PlaceSheet 는 지도·홈·채널 등 여러 트리에서 렌더된다. 하나라도 프로바이더 밖에
 * 있으면 throw 하는 훅은 그 화면을 통째로 죽인다. 저장은 부가 기능이므로
 * "동작하지 않음" 이 "화면이 안 뜸" 보다 낫다.
 */
export function useSaved(): Ctx {
  return (
    useContext(SavedContext) ?? {
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
    }
  );
}
