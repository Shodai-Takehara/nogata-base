import type { LatLng } from '@/domain/models';

import { openExternalUrl } from './external-link';

/** 経路案内はアプリ内に持たず、標準の地図アプリに委ねる(Google Maps API 不要) */
export function openRouteInMaps(coord: LatLng, name: string) {
  openUrl(
    `http://maps.apple.com/?daddr=${coord.latitude},${coord.longitude}&q=${encodeURIComponent(name)}`,
  );
}

/**
 * 経路ではなく場所を開く版。伝承碑のように「向かう」より「どこにあるか見る」ものに使う
 * (daddr で開くと現在地からの経路探索が始まり、遠くにいると長い経路を出してしまう)
 */
export function openPlaceInMaps(coord: LatLng, name: string) {
  openUrl(
    `http://maps.apple.com/?ll=${coord.latitude},${coord.longitude}&q=${encodeURIComponent(name)}`,
  );
}

/**
 * 住所文字列を目的地にする版。番地単位の座標を持たない施設は、
 * 手元の概略座標より地図アプリに住所を解決させる方が正確なため
 */
export function openRouteToAddress(address: string) {
  openUrl(`http://maps.apple.com/?daddr=${encodeURIComponent(address)}`);
}

function openUrl(url: string) {
  openExternalUrl(url, { title: 'alertMapsFailedTitle', body: 'alertMapsFailedBody' });
}
