import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

type Props = {
  /** バッジに出す数(塗りと区域の有効数)。0 のときはバッジを出さない */
  count: number;
  onPress: () => void;
};

/**
 * 地図左上のレイヤーボタン。チップの並びに代わり、
 * 何を出すかの選択をレイヤー選択シートへ集める入口
 */
export function LayersButton({ count, onPress }: Props) {
  const copy = useCopy();
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={copy.a11yLayersButton}
      accessibilityValue={count > 0 ? { text: String(count) } : undefined}>
      {/* 記号は文字サイズ設定で拡大しない(ボタンの高さを丸ボタンと揃えるため) */}
      <Text style={styles.icon}>≡</Text>
      {/* 特大でも右側の丸ボタンに届かないよう、拡大は標準相当までに抑える */}
      <AppText maxScale={LABEL_MAX_SCALE} style={styles.label}>
        {copy.layersButton}
      </AppText>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const LABEL_MAX_SCALE = 1.2;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  icon: {
    fontSize: 20,
    color: AppColors.primary,
    marginTop: -2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.ink,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
});
