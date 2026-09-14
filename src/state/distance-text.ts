import type { ShelterDistance } from '@/domain/shelter-order';
import { formatDistanceMeters, walkingMinutes } from '@/utils/geo';

import type { CopyKey } from './plain-japanese-copy';

/** 距離の表示に使う語。表示と読み上げ(標準の語で組む側)が同じ一覧から引く */
export const DISTANCE_COPY_KEYS = [
  'approxPrefix',
  'distanceRoad',
  'distanceStraight',
  'walkPrefix',
  'unitMinutes',
  'walkAtLeast',
] as const satisfies readonly CopyKey[];

export type DistanceCopy = Record<(typeof DISTANCE_COPY_KEYS)[number], string>;

/**
 * 自宅からの距離と徒歩分数の表示(「道のり 約 650m・徒歩 8分以上」)。
 * 道のりか直線かを必ず添え、分数は「以上」にする。最短経路を速めの歩きで割った下限で、
 * 坂や夜、災害時の通行止めでは必ず長くなるため、「約」で済ませると短く見積もらせてしまう
 */
export function distanceWithWalk(distance: ShelterDistance, copy: DistanceCopy): string {
  const minutes = walkingMinutes(distance.meters);
  if (minutes == null) return '—';
  const kind = distance.measured === 'road' ? copy.distanceRoad : copy.distanceStraight;
  const length = `${kind} ${copy.approxPrefix} ${formatDistanceMeters(distance.meters)}`;
  const walk = `${copy.walkPrefix} ${minutes}${copy.unitMinutes}${copy.walkAtLeast}`;
  return `${length}・${walk}`;
}
