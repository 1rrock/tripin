-- 통계 캐시 재계산 함수
--
-- 왜 필요한가 — `creator_cities.place_count` 와 `creators.{place_count,city_count,video_count}`
-- 는 런타임 집계를 피하려고 둔 캐시다. 그런데 갱신 경로가 어드민 서버액션(recountPiece) 하나뿐이라,
-- `scripts/ingest/*` 로 넣은 데이터는 캐시를 건드리지 않아 값이 어긋난다.
-- (실제로 fukuoka-ajo 가 66곳인데 캐시는 0 이었고, home.ts 가 이 값으로 정렬해 맨 뒤로 밀렸다)
--
-- 정의를 한 군데 두려고 SQL 함수로 뺐다. 어드민 버튼과 인제스트 스크립트가 같은 걸 부른다.
--
-- ⚠️ 공개(is_published) 기준으로 센다. home.ts 가 공개 카드를 정렬하는 데 쓰므로
--    비공개(폐업 등)를 포함하면 순서가 실제 노출량과 어긋난다.

create or replace function public.recount_stats()
returns table (creators_updated int, pieces_updated int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pieces int;
  v_creators int;
begin
  -- ① 조각(채널×도시) 단위 — 실제 연결에서 다시 만든다.
  --    없어진 조합은 0 으로 남기지 않고 지운다(빈 조각이 목록에 유령으로 남지 않게).
  with truth as (
    select v.creator_id, p.city_id, count(distinct p.id)::int as n
    from places p
    join video_places vp on vp.place_id = p.id
    join videos v on v.id = vp.video_id
    where p.is_published
    group by v.creator_id, p.city_id
  ),
  upserted as (
    insert into creator_cities (creator_id, city_id, place_count)
    select creator_id, city_id, n from truth
    on conflict (creator_id, city_id) do update set place_count = excluded.place_count
    returning 1
  )
  select count(*)::int into v_pieces from upserted;

  -- 연결이 사라진 조각은 0 으로 내린다. published_at·intro_text 는 사람이 쓴 값이라 지우지 않는다.
  update creator_cities cc
  set place_count = 0
  where not exists (
    select 1 from places p
    join video_places vp on vp.place_id = p.id
    join videos v on v.id = vp.video_id
    where v.creator_id = cc.creator_id and p.city_id = cc.city_id and p.is_published
  ) and cc.place_count <> 0;

  -- ② 크리에이터 단위
  with agg as (
    select c.id,
           coalesce(pl.n, 0)::int as places,
           coalesce(ci.n, 0)::int as cities,
           coalesce(vi.n, 0)::int as videos
    from creators c
    left join (
      select v.creator_id, count(distinct p.id) n
      from places p
      join video_places vp on vp.place_id = p.id
      join videos v on v.id = vp.video_id
      where p.is_published
      group by v.creator_id
    ) pl on pl.creator_id = c.id
    left join (
      select v.creator_id, count(distinct p.city_id) n
      from places p
      join video_places vp on vp.place_id = p.id
      join videos v on v.id = vp.video_id
      where p.is_published
      group by v.creator_id
    ) ci on ci.creator_id = c.id
    left join (
      select creator_id, count(*) n from videos group by creator_id
    ) vi on vi.creator_id = c.id
  ),
  bumped as (
    update creators c
    set place_count = a.places, city_count = a.cities, video_count = a.videos
    from agg a
    where a.id = c.id
      and (c.place_count, c.city_count, c.video_count) is distinct from (a.places, a.cities, a.videos)
    returning 1
  )
  select count(*)::int into v_creators from bumped;

  return query select v_creators, v_pieces;
end;
$$;

comment on function public.recount_stats() is
  '통계 캐시(creator_cities.place_count, creators.*_count)를 실제 데이터에서 재계산한다. 공개(is_published) 기준.';

-- 익명에게는 필요 없다. 서비스 롤만 호출한다.
revoke all on function public.recount_stats() from public, anon, authenticated;
