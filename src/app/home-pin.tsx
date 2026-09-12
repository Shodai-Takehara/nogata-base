import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { AppColors, NOGATA_REGION } from '@/constants/tokens';
import type { LatLng } from '@/domain/models';
import { useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';
import { getCurrentLocation } from '@/utils/current-location';

/**
 * じぶん設定。自宅(よく居る場所)を地図のピンで設定する。
 * 住所のテキスト入力は設けない(要件)。値は端末内にのみ保存する。
 */
export default function HomePinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const { settings, update } = useSettings();
  const saved = settings.homePin;
  // 状態はタップした下書きだけ持ち、表示ピンは「下書き ?? 保存済み」で導出する
  const [draft, setDraft] = useState<LatLng | null>(null);
  const pin = draft ?? saved;
  const mapRef = useRef<MapView>(null);

  const placePin = useCallback((e: MapPressEvent) => {
    setDraft(e.nativeEvent.coordinate);
  }, []);

  // 自宅で操作する場面が多いはずなので、現在地をそのまま下書きにできる導線を持つ
  const placePinAtCurrentLocation = useCallback(async () => {
    const coord = await getCurrentLocation();
    if (!coord) return;
    setDraft(coord);
    mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.01, longitudeDelta: 0.008 }, 600);
  }, []);

  const save = useCallback(() => {
    if (!draft) return;
    update({ homePin: draft });
    router.back();
  }, [draft, update, router]);

  const clear = useCallback(() => {
    update({ homePin: null });
    setDraft(null);
  }, [update]);

  // 保存済みと同一地点の再保存は意味がないため押せなくする
  const canSave =
    draft != null &&
    (saved == null || draft.latitude !== saved.latitude || draft.longitude !== saved.longitude);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.a11yBackToPrev}>
          <AppText style={styles.headerBack}>‹ {copy.back}</AppText>
        </Pressable>
        <AppText style={styles.headerTitle}>{copy.homePinTitle}</AppText>
        {/* タイトルを中央に保つための戻ると同幅のスペーサー */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={
            saved
              ? {
                  latitude: saved.latitude,
                  longitude: saved.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.008,
                }
              : NOGATA_REGION
          }
          onPress={placePin}>
          {pin ? <Marker coordinate={pin} pinColor={AppColors.primary} /> : null}
        </MapView>
        <Pressable
          style={styles.locateButton}
          onPress={placePinAtCurrentLocation}
          accessibilityRole="button"
          accessibilityLabel={copy.a11yPinAtMyLocation}>
          {/* 丸ボタンは大きさ固定のため、文字サイズ設定で拡大しない素の Text を使う */}
          <Text style={styles.locateIcon}>➤</Text>
        </Pressable>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
        <AppText style={styles.hint}>{copy.homePinHint}</AppText>
        <AppText style={styles.note}>{copy.homePinPrivacyNote}</AppText>
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          accessibilityLabel={copy.a11yHomePinSave}>
          <AppText style={styles.saveButtonText}>{copy.homePinSave}</AppText>
        </Pressable>
        {saved ? (
          <Pressable
            style={styles.clearButton}
            onPress={clear}
            accessibilityRole="button"
            accessibilityLabel={copy.a11yHomePinClear}>
            <AppText style={styles.clearButtonText}>{copy.homePinClear}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.paper,
  },
  headerBack: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
    width: 64,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.ink,
  },
  headerSpacer: {
    width: 64,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  locateIcon: {
    fontSize: 16,
    color: AppColors.primary,
    // 位置情報の矢印らしく北東向きに傾ける(ホーム地図と同じ見た目)
    transform: [{ rotate: '-45deg' }],
    marginTop: 2,
  },
  panel: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  hint: {
    fontSize: 13,
    color: AppColors.ink,
  },
  note: {
    fontSize: 11,
    color: AppColors.inkSub,
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    backgroundColor: AppColors.none,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  clearButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.danger,
  },
});
