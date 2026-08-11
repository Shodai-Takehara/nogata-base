import { Alert, Linking } from 'react-native';

import type { LatLng } from '@/domain/models';
import { copyText } from '@/state/plain-japanese';

/** 経路案内はアプリ内に持たず、標準の地図アプリに委ねる(Google Maps API 不要) */
export function openRouteInMaps(coord: LatLng, name: string) {
  openUrl(
    `http://maps.apple.com/?daddr=${coord.latitude},${coord.longitude}&q=${encodeURIComponent(name)}`,
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
  Linking.openURL(url).catch(() => {
    Alert.alert(copyText('alertMapsFailedTitle'), copyText('alertMapsFailedBody'));
  });
}
