import { haversineMeters } from '@/utils/geo';

import type { LatLng, Shelter } from './models';
import { isShelterOpen, type HazardType } from './status';

/** 自宅から各避難所までの距離(m)を id 引きで返す。自宅未設定は null(距離表示なし) */
export function shelterDistances(
  shelters: Shelter[],
  homePin: LatLng | null,
): Map<number, number> | null {
  if (!homePin) return null;
  return new Map(shelters.map((s) => [s.id, haversineMeters(homePin, s.coord)]));
}

/**
 * 避難所一覧の並び順。
 * 開設中を上位にするのは、災害時にいま行ける場所を先に見せるためで、
 * 自宅ピン設定時の距離順でも崩さない。距離がなければ従来どおり
 * 混雑の軽い順(行きやすい順)で並べる。
 */
export function sortSheltersForList(
  shelters: Shelter[],
  distanceById: Map<number, number> | null,
): Shelter[] {
  return [...shelters].sort((a, b) => {
    const openA = isShelterOpen(a.opening) ? 0 : 1;
    const openB = isShelterOpen(b.opening) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    if (distanceById) {
      // 距離未算出(理論上ない)は最後尾へ回す
      const da = distanceById.get(a.id) ?? Number.POSITIVE_INFINITY;
      const db = distanceById.get(b.id) ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
    } else if (a.opening !== b.opening) {
      return a.opening.localeCompare(b.opening);
    }
    return a.name.localeCompare(b.name, 'ja');
  });
}

export type NearestShelter = { shelter: Shelter; meters: number };

/**
 * 指定の災害種別に対応する避難所のうち、自宅から最も近いもの。
 * 開設の有無は問わない(平常時の備えとして、どこへ向かうかを知らせるため)。
 * 距離は id 引きの表を使わず自宅から直接測る(取り込みで OBJECTID を欠いた施設は id が 0 で
 * 重なり、表だと別の施設の距離を引いてしまう)
 */
export function nearestShelterFor(
  shelters: Shelter[],
  homePin: LatLng,
  hazard: HazardType,
): NearestShelter | null {
  let best: NearestShelter | null = null;
  for (const shelter of shelters) {
    if (!shelter.hazards[hazard]) continue;
    const meters = haversineMeters(homePin, shelter.coord);
    if (!best || meters < best.meters) best = { shelter, meters };
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
  if (!homePin) return [];
  const flood = nearestShelterFor(shelters, homePin, 'flood');
  const quake = nearestShelterFor(shelters, homePin, 'earthquake');
  // 同じ施設かは id でなく同一の要素かで比べる(id は重なりうる。上記)
  if (flood && quake && flood.shelter === quake.shelter) {
    return [{ ...flood, scope: 'both' }];
  }
  const entries: NearestEntry[] = [];
  if (flood) entries.push({ ...flood, scope: 'flood' });
  if (quake) entries.push({ ...quake, scope: 'earthquake' });
  return entries;
}
