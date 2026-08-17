-- 낚시장소(포인트·방파제·낚시터) 종류.
-- 진석기시대·국산낚시·선태공 등 낚시 채널을 넣을 때 맛집과 구분한다.
alter type place_type add value if not exists 'fishing';
