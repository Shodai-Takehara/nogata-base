import { haversineMeters } from '@/utils/geo';

import type { LatLng, Shelter } from './models';
import { isShelterOpen } from './status';

/** 自宅から各避難所までの距離(m)を id 引きで返す。自宅未設定は null(距離表示なし) */
export function shelterDistances(
  shelters: Shelter[],
  homePin: LatLng | null,
): Map<number, number> | null {
  if (!homePin) return null;
  return new Map(shelters.map((s) => [s.id, haversineMeters(homePin, s.coord)]));
}

/**
 * 避難所一覧の並び順(F-02 / F-12)。
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
