import { useMemo, type ReactNode } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

/**
 * ボトムシートの中身。peek は1行の要約、summary は要約の全行、
 * layers はレイヤー選択の一覧
 */
export type SheetMode = 'peek' | 'summary' | 'layers';

type Props = {
  mode: SheetMode;
  onChangeMode: (mode: SheetMode) => void;
  /** 塗りか区域があるときの凡例。シートの上に載せて一緒に動かす */
  legend: ReactNode;
  /** ピンや塗りをタップしたときの詳細。あるときは要約とレイヤー選択の代わりに出す */
  detail: ReactNode;
  peek: ReactNode;
  summary: ReactNode;
  layers: ReactNode;
};

/** レイヤー選択のとき画面高に占める割合。中はスクロールするので固定でよい */
const LAYERS_HEIGHT_RATIO = 0.55;

/** 要約が画面高に占める上限。特大文字で行が増えても地図を半分以上残す */
const SUMMARY_HEIGHT_RATIO = 0.4;

const SHEET_TRANSITION = LinearTransition.duration(220);

/** つまみを引いたとき、状態を切り替える指の移動量(pt) */
const DRAG_THRESHOLD = 30;

/** 指に追従して動かす上限(pt)。中身の高さは変えないので、動きは「引ける手応え」にとどめる */
const DRAG_FOLLOW_MAX = 24;

/**
 * 地図の下部に1枚だけ置くシート(S-01)。要約、レイヤー選択、詳細のどれもこの中で
 * 切り替え、地図の上に積み上げない。
 * 高さの変化は中身に任せ、位置の変化だけを layout アニメーションで動かす
 * (高さを JS で毎フレーム更新すると地図の上でレイアウトが走り続けるため)。
 * つまみの引き下げ/引き上げは React Native 標準の PanResponder で取る。
 * react-native-gesture-handler は依存にあるがルートに GestureHandlerRootView が無く、
 * 入れるとルートの構成が変わるため使わない
 */
export function MapBottomSheet({
  mode,
  onChangeMode,
  legend,
  detail,
  peek,
  summary,
  layers,
}: Props) {
  const copy = useCopy();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const drag = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_e, g) => {
          drag.set(Math.max(-DRAG_FOLLOW_MAX, Math.min(DRAG_FOLLOW_MAX, g.dy * 0.5)));
        },
        onPanResponderRelease: (_e, g) => {
          drag.set(withTiming(0, { duration: 180 }));
          if (g.dy > DRAG_THRESHOLD) {
            onChangeMode('peek');
          } else if (g.dy < -DRAG_THRESHOLD) {
            if (mode === 'peek') onChangeMode('summary');
          } else if (Math.abs(g.dy) <= 4) {
            // 指が動いていなければタップとみなす
            onChangeMode(mode === 'peek' ? 'summary' : 'peek');
          }
        },
        onPanResponderTerminate: () => {
          drag.set(withTiming(0, { duration: 180 }));
        },
      }),
    [drag, mode, onChangeMode],
  );

  const handleLabel =
    mode === 'peek'
      ? copy.a11ySummaryExpand
      : mode === 'summary'
        ? copy.a11ySummaryCollapse
        : copy.close;

  return (
    <Animated.View
      layout={SHEET_TRANSITION}
      style={[
        styles.area,
        { bottom: insets.bottom + 8 },
        mode === 'layers' && !detail && { height: windowHeight * LAYERS_HEIGHT_RATIO },
        dragStyle,
      ]}>
      {/* レイヤー選択の中では各項目の下に凡例の全文が出るため、帯は重ねない */}
      {mode !== 'layers' || detail ? legend : null}
      {detail ?? (
        <View style={[styles.card, mode === 'layers' && styles.cardFill]}>
          <View {...pan.panHandlers} style={styles.handle}>
            {/* 読み上げ対象はつまみだけにする。行全体を1要素にすると、中の再試行や
                閉じるボタンが VoiceOver から届かなくなる */}
            <View
              style={styles.grabber}
              accessible
              accessibilityRole="button"
              accessibilityLabel={handleLabel}
              accessibilityState={{ expanded: mode !== 'peek' }}
            />
            {mode === 'peek' ? (
              <View style={styles.headerRow}>
                <View style={styles.headerMain}>{peek}</View>
                <AppText style={styles.chevron}>▴</AppText>
              </View>
            ) : mode === 'summary' ? (
              <View style={styles.headerRow}>
                <AppText style={styles.title}>{copy.summaryTitle}</AppText>
                <AppText style={styles.chevron}>▾</AppText>
              </View>
            ) : (
              <View style={styles.headerRow}>
                <AppText style={styles.sheetTitle}>{copy.layerSheetTitle}</AppText>
                <Pressable
                  onPress={() => onChangeMode('peek')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={copy.close}>
                  <AppText style={styles.close}>✕</AppText>
                </Pressable>
              </View>
            )}
          </View>
          {mode === 'summary' ? (
            <ScrollView style={{ maxHeight: windowHeight * SUMMARY_HEIGHT_RATIO }}>
              {summary}
            </ScrollView>
          ) : null}
          {mode === 'layers' ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {layers}
            </ScrollView>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 8,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    shadowColor: '#14283C',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardFill: {
    flex: 1,
  },
  handle: {
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.line,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    // つまみ(上余白 8 + 太さ 4 + 下余白 6)と合わせて 44pt 以上の操作対象にする
    minHeight: 28,
  },
  headerMain: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.inkSub,
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.ink,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  close: {
    fontSize: 15,
    color: AppColors.inkSub,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
});
