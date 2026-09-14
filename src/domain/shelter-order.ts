import { haversineMeters } from '@/utils/geo';
import { walkDistancesFrom } from '@/utils/walk-route';

import type { LatLng, Shelter } from './models';
import { isShelterOpen, type HazardType } from './status';

/**
 * 自宅から避難所までの距離。道のり(歩ける道をたどった最短経路)を基本にし、
 * 自宅が道から離れている、道がつながっていない、などで引けない避難所だけ直線で補う
 */
export type ShelterDistance = { meters: number; measured: 'road' | 'straight' };

/**
 * 直前の道のりの結果。ホームと避難所一覧が別々に取ったデータで同じ計算をし、
 * 更新のたびに配列が作り直されても、自宅と避難所の座標が同じなら経路を引き直さない
 */
let lastRoad: { key: string; road: (number | null)[] } | null = null;

/**
 * 自宅から各避難所までの距離。自宅未設定は null(距離表示なし)。
 * 表のキーは id でなく避難所そのもの(取り込みで OBJECTID を欠いた施設は id が 0 で重なる)。
 * 最短経路は自宅から1回引くだけなので、避難所の数だけ経路を引くより軽い
 */
export function shelterDistances(
  shelters: Shelter[],
  homePin: LatLng | null,
): Map<Shelter, ShelterDistance> | null {
  if (!homePin) return null;
  if (shelters.length === 0) return new Map();
  const key = [
    homePin.latitude,
    homePin.longitude,
    ...shelters.map((s) => `${s.coord.latitude},${s.coord.longitude}`),
  ].join(';');
  if (lastRoad?.key !== key) {
    lastRoad = {
      key,
      road: walkDistancesFrom(
        homePin,
        shelters.map((s) => s.coord),
      ),
    };
  }
  const road = lastRoad.road;
  return new Map(
    shelters.map((s, i) => {
      const meters = road[i];
      return [
        s,
        meters != null
          ? { meters, measured: 'road' }
          : { meters: haversineMeters(homePin, s.coord), measured: 'straight' },
      ];
    }),
  );
}

/**
 * 近い順の比較。直線で補った距離は道のりより必ず短く出るので、道のりのある避難所を先にし、
 * 直線しかない避難所はその後ろに置く(直線の短さで最寄りに見せない)。距離が無ければ最後尾
 */
export function compareDistance(
  a: ShelterDistance | undefined,
  b: ShelterDistance | undefined,
): number {
  const rankA = a ? (a.measured === 'road' ? 0 : 1) : 2;
  const rankB = b ? (b.measured === 'road' ? 0 : 1) : 2;
  if (rankA !== rankB) return rankA - rankB;
  return (a?.meters ?? 0) - (b?.meters ?? 0);
}

/**
 * 避難所一覧の並び順。
 * 開設中を上位にするのは、災害時にいま行ける場所を先に見せるためで、
 * 自宅ピン設定時の距離順でも崩さない。距離がなければ従来どおり
 * 混雑の軽い順(行きやすい順)で並べる。
 */
export function sortSheltersForList(
  shelters: Shelter[],
  distances: Map<Shelter, ShelterDistance> | null,
): Shelter[] {
  return [...shelters].sort((a, b) => {
    const openA = isShelterOpen(a.opening) ? 0 : 1;
    const openB = isShelterOpen(b.opening) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    if (distances) {
      const byDistance = compareDistance(distances.get(a), distances.get(b));
      if (byDistance !== 0) return byDistance;
    } else if (a.opening !== b.opening) {
      return a.opening.localeCompare(b.opening);
    }
    return a.name.localeCompare(b.name, 'ja');
  });
}

export type NearestShelter = { shelter: Shelter; distance: ShelterDistance };

/**
 * 指定の災害種別に対応する避難所のうち、自宅から最も近いもの。
 * 開設の有無は問わない(平常時の備えとして、どこへ向かうかを知らせるため)
 */
export function nearestShelterFor(
  shelters: Shelter[],
  distances: Map<Shelter, ShelterDistance>,
  hazard: HazardType,
): NearestShelter | null {
  let best: NearestShelter | null = null;
  for (const shelter of shelters) {
    if (!shelter.hazards[hazard]) continue;
    const distance = distances.get(shelter);
    if (!distance) continue;
    if (!best || compareDistance(distance, best.distance) < 0) best = { shelter, distance };
  }
  return best;
}

/** 最寄りの行の見出し。水害時と地震時で同じ施設なら1行にまとめる */
export type NearestScope = Extract<HazardType, 'flood' | 'earthquake'> | 'both';

export type NearestEntry = NearestShelter & { scope: NearestScope };

/**
 * 要約に出す最寄り避難所。水害時と地震時で分けるのは、地震に対応しない避難所が
 * 最寄りでも地震では使えないため。同じ施設なら1行にまとめて読む量を減らす
 */
export function nearestSheltersForHome(
  shelters: Shelter[],
  homePin: LatLng | null,
): NearestEntry[] {
  const distances = shelterDistances(shelters, homePin);
  if (!distances) return [];
  const flood = nearestShelterFor(shelters, distances, 'flood');
  const quake = nearestShelterFor(shelters, distances, 'earthquake');
  if (flood && quake && flood.shelter === quake.shelter) {
    return [{ ...flood, scope: 'both' }];
  }
  const entries: NearestEntry[] = [];
  if (flood) entries.push({ ...flood, scope: 'flood' });
  if (quake) entries.push({ ...quake, scope: 'earthquake' });
  return entries;
}
