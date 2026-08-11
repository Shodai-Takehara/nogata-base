import * as Location from 'expo-location';
import { Alert } from 'react-native';

import type { LatLng } from '@/domain/models';
import { copyText } from '@/state/plain-japanese';

/** 測位 API に上限がないため、屋内などで押したボタンが無反応に見え続けるのを防ぐ */
const LOCATION_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('現在地の取得がタイムアウトしました')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

/**
 * 現在地を1回だけ取得する。許可なし・取得失敗はここで案内を出して null を返すので、
 * 呼び出し側は中断するだけでよい(ホーム地図とじぶん設定で同じ振る舞いにするため共通化)。
 * 許可の要求は呼び出し時に行う(画面表示だけで位置情報を求めない)。
 */
export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(copyText('alertLocationDeniedTitle'), copyText('alertLocationDeniedBody'));
      return null;
    }
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    Alert.alert(copyText('alertLocationFailedTitle'), copyText('alertLocationFailedBody'));
    return null;
  }
}
