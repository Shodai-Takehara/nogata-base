import Slider from '@react-native-community/slider';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useAnimatedValue, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { FloodScene, type WaterKind } from '@/features/ar/flood-scene';
import {
  clampDepth,
  clampFloorHeight,
  DEFAULT_DEPTH_M,
  DEFAULT_FLOOR_HEIGHT_M,
  DEPTH_MAX_M,
  DEPTH_MIN_M,
  DEPTH_STEP_M,
  effectiveWaterDepth,
  FLOOR_HEIGHT_MAX_M,
  FLOOR_HEIGHT_MIN_M,
  formatDepth,
} from '@/features/ar/water-plane';
import { fetchFloodDepthAt, type FloodDepthRank } from '@/features/hazard/flood-depth';
import { useCopy } from '@/state/plain-japanese';

/**
 * AR 浸水体験の本体。ViroKit は実機専用のため、このモジュールを
 * ルート(src/app/ar.tsx)から直接 import しないこと(遅延 require で読み込む)。
 */
export default function FloodExperience() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const [depthM, setDepthM] = useState(DEFAULT_DEPTH_M);
  const [floorHeightM, setFloorHeightM] = useState(DEFAULT_FLOOR_HEIGHT_M);
  const [waterKind, setWaterKind] = useState<WaterKind>('muddy');
  const [groundFound, setGroundFound] = useState(false);
  const [siteRank, setSiteRank] = useState<FloodDepthRank | null>(null);
  const [siteLookupDone, setSiteLookupDone] = useState(false);
  const effectiveDepthM = effectiveWaterDepth(depthM, floorHeightM);

  // 現在地の想定浸水深。取れたら水面の初期値にする。
  // 位置情報は端末内でタイル座標の計算に使うだけで、外部へは送らない
  useEffect(() => {
    let cancelled = false;
    const lookup = async (): Promise<FloodDepthRank | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return fetchFloodDepthAt(position.coords.latitude, position.coords.longitude);
    };
    // 屋内等で GPS が返らないと「取得中…」のまま固まるため、全体を有限時間で打ち切る
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000));
    Promise.race([lookup(), timeout])
      .then((rank) => {
        if (cancelled || rank == null) return;
        setSiteRank(rank);
        setDepthM(clampDepth(rank.arDepthM));
      })
      .catch(() => {
        // 位置が取れない・圏外などは既定値のまま動かす(体験自体は成立する)
      })
      .finally(() => {
        if (!cancelled) setSiteLookupDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDepthChange = useCallback((value: number) => {
    setDepthM(clampDepth(value));
  }, []);

  const handleFloorHeightChange = useCallback((value: number) => {
    setFloorHeightM(clampFloorHeight(value));
  }, []);

  // viroAppProps は毎レンダー新オブジェクトになるとシーンの無駄な更新を招くため固定化する
  const viroAppProps = useMemo(
    () => ({ depthM, floorHeightM, waterKind, onGroundStateChange: setGroundFound }),
    [depthM, floorHeightM, waterKind],
  );

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        style={styles.scene}
        autofocus
        // depthBased(現実の物体全てで水面を隠す)は使えない: LiDAR 機(17 Pro)でも
        // 深度値の解釈が逆転しており(近景が遠景と判定される。デバッグ表示で確認、
        // 2026-07-17)、有効にすると全ピクセルが遮蔽されて真っ黒になる。ViroKit 側の
        // 不具合のため JS からは補正できない。人物の切り抜き精度は高かったため、
        // 別経路の人物セグメンテーションだけを使い「人が水に浸かる」見え方を得る
        occlusionMode="peopleOnly"
        initialScene={{ scene: FloodScene }}
        viroAppProps={viroAppProps}
      />

      <View style={[styles.statusChip, { top: insets.top + 8 }]}>
        <AppText style={styles.statusText}>
          {groundFound ? copy.arShowingWater : copy.arSearchingFloor}
        </AppText>
      </View>

      {!groundFound ? <CoachingOverlay /> : null}

      <Pressable
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => {
          // ディープリンクで直接開かれた場合は履歴がないため、ホームへ置き換える
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        accessibilityLabel={copy.a11yArClose}>
        {/* 閉じるボタンは大きさ固定のため、文字サイズ設定で拡大しない素の Text を使う */}
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.resultRow}>
          <AppText
            style={[
              styles.resultText,
              effectiveDepthM > 0 ? styles.resultDanger : styles.resultSafe,
            ]}>
            {effectiveDepthM > 0
              ? `${copy.arEffectiveDepthLabel} ${formatDepth(effectiveDepthM)}`
              : copy.arNoFlood}
          </AppText>
          <View style={styles.kindRow}>
            <KindChip
              kindLabel={copy.a11yArWaterKind}
              label={copy.arWaterMuddy}
              active={waterKind === 'muddy'}
              onPress={() => setWaterKind('muddy')}
            />
            <KindChip
              kindLabel={copy.a11yArWaterKind}
              label={copy.arWaterClear}
              active={waterKind === 'clear'}
              onPress={() => setWaterKind('clear')}
            />
          </View>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.sliderLabelRow}>
            <AppText style={styles.sliderLabel}>{copy.arDepthSliderLabel}</AppText>
            <AppText style={styles.sliderValue}>{formatDepth(depthM)}</AppText>
          </View>
          <Slider
            minimumValue={DEPTH_MIN_M}
            maximumValue={DEPTH_MAX_M}
            step={DEPTH_STEP_M}
            value={depthM}
            onValueChange={handleDepthChange}
            minimumTrackTintColor={AppColors.ember}
            thumbTintColor={AppColors.ember}
          />
          <AppText style={styles.siteHint}>
            {!siteLookupDone
              ? copy.arSiteLookupInProgress
              : siteRank
                ? `${copy.arSiteRankLabel}: ${siteRank.label}${copy.arSiteRankScale}`
                : copy.arSiteNoData}
          </AppText>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.sliderLabelRow}>
            <AppText style={styles.sliderLabel}>{copy.arFloorSliderLabel}</AppText>
            <AppText style={styles.sliderValue}>{formatDepth(floorHeightM)}</AppText>
          </View>
          <Slider
            minimumValue={FLOOR_HEIGHT_MIN_M}
            maximumValue={FLOOR_HEIGHT_MAX_M}
            value={floorHeightM}
            onValueChange={handleFloorHeightChange}
            minimumTrackTintColor={AppColors.primary}
            thumbTintColor={AppColors.primary}
          />
          <AppText style={styles.siteHint}>{copy.arFloorHint}</AppText>
        </View>
      </View>
    </View>
  );
}

function KindChip({
  label,
  kindLabel,
  active,
  onPress,
}: {
  label: string;
  /** 読み上げ用の「水の種類」。表示モードに合わせるため呼び出し側の文言カタログから渡す */
  kindLabel: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.kindChip, active && styles.kindChipActive]}
      onPress={onPress}
      accessibilityLabel={`${kindLabel}: ${label}`}>
      <AppText style={[styles.kindChipText, active && styles.kindChipTextActive]}>{label}</AppText>
    </Pressable>
  );
}

/**
 * ARKit 標準のコーチング UI(ARCoachingOverlayView)は Viro から利用できないため、
 * 同等の「端末を動かして床を映す」案内を自前で重ねる。
 */
function CoachingOverlay() {
  const copy = useCopy();
  const shift = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shift, { toValue: -1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const translateX = shift.interpolate({ inputRange: [-1, 1], outputRange: [-26, 26] });

  return (
    <View style={styles.coach} pointerEvents="none">
      <Animated.Text style={[styles.coachIcon, { transform: [{ translateX }] }]}>📱</Animated.Text>
      <AppText style={styles.coachText}>{copy.arCoaching}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scene: {
    flex: 1,
  },
  coach: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(14, 42, 61, 0.65)',
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 18,
  },
  coachIcon: {
    fontSize: 34,
  },
  coachText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  statusChip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(14, 42, 61, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '78%',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    left: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 42, 61, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
  },
  controls: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  resultDanger: {
    color: AppColors.danger,
  },
  resultSafe: {
    color: AppColors.ok,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 6,
  },
  kindChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#EDEAE2',
  },
  kindChipActive: {
    backgroundColor: AppColors.primary,
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.inkSub,
  },
  kindChipTextActive: {
    color: '#fff',
  },
  sliderBlock: {
    marginTop: 2,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sliderLabel: {
    fontSize: 12,
    color: AppColors.inkSub,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  siteHint: {
    fontSize: 10,
    color: AppColors.inkSub,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
});
