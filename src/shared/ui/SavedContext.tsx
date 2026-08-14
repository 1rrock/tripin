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
  EMPTY_SNAPSHOT,
  loadSaved,
  setSaved,
  setSubscribed,
  setVisited,
  type SavedSnapshot,
} from "@/shared/api/saved";

type Ctx = {
  ready: boolean;
  isSaved: (placeId: string) => boolean;
  isVisited: (placeId: string) => boolean;
  isSubscribed: (creatorId: string) => boolean;
  savedCount: number;
  toggleSaved: (placeId: string) => Promise<void>;
  toggleVisited: (placeId: string) => Promise<void>;
  toggleSubscribed: (creatorId: string) => Promise<void>;
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
      /* 낙관적 갱신 — 해제할 때는 '갔던 곳' 도 같이 내린다. 저장이 없으면
         목록에 안 나오는데 visited 만 남아 있으면 상태가 어긋난다. */
      setSnap((s) => ({
        ...s,
        places: toggled(s.places, placeId, next),
        visited: next ? s.visited : toggled(s.visited, placeId, false),
      }));

      const ok = await setSaved(placeId, next);
      if (!ok) {
        setSnap((s) => ({
          ...s,
          places: toggled(s.places, placeId, !next),
        }));
      }
    },
    [snap.places],
  );

  const toggleVisitedCb = useCallback(
    async (placeId: string) => {
      const next = !snap.visited.has(placeId);
      /* 가본 곳으로 찍으면 저장도 같이 켠다 — setVisited 가 DB 에서도 같이 넣는다 */
      setSnap((s) => ({
        ...s,
        visited: toggled(s.visited, placeId, next),
        places: next ? toggled(s.places, placeId, true) : s.places,
      }));

      const ok = await setVisited(placeId, next);
      if (!ok) {
        setSnap((s) => ({ ...s, visited: toggled(s.visited, placeId, !next) }));
      }
    },
    [snap.visited],
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

  return (
    <SavedContext.Provider
      value={{
        ready,
        isSaved: (id) => snap.places.has(id),
        isVisited: (id) => snap.visited.has(id),
        isSubscribed: (id) => snap.creators.has(id),
        savedCount: snap.places.size,
        toggleSaved: toggleSavedCb,
        toggleVisited: toggleVisitedCb,
        toggleSubscribed: toggleSubscribedCb,
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
      isVisited: () => false,
      isSubscribed: () => false,
      savedCount: 0,
      toggleSaved: async () => {},
      toggleVisited: async () => {},
      toggleSubscribed: async () => {},
    }
  );
}
