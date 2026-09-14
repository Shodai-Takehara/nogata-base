import { formatDistanceMeters, walkingMinutes } from '@/utils/geo';

import type { CopyKey } from './plain-japanese-copy';

type DistanceCopy = Pick<Record<CopyKey, string>, 'approxPrefix' | 'walkPrefix' | 'unitMinutes'>;

/**
 * 自宅からの距離と徒歩分数の表示(「約 600m・徒歩 約 8分」)。
 * 直線距離から出した目安なので、距離にも分数にも「約」を付ける
 */
export function distanceWithWalk(meters: number, copy: DistanceCopy): string {
  const minutes = walkingMinutes(meters);
  if (minutes == null) return '—';
  const distance = `${copy.approxPrefix} ${formatDistanceMeters(meters)}`;
  const walk = `${copy.walkPrefix} ${copy.approxPrefix} ${minutes}${copy.unitMinutes}`;
  return `${distance}・${walk}`;
}
