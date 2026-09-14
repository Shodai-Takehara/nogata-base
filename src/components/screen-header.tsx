import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

/**
 * その他タブから開く画面の見出し。
 * ナビゲーションの標準ヘッダーは使わない(タブと同じ紙色の地に、文字サイズ設定が効く AppText で揃える)
 */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const copy = useCopy();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={copy.a11yBackToPrev}>
        <AppText style={styles.back}>‹ {copy.back}</AppText>
      </Pressable>
      {/* 平易版+特大で読みの途中で切れないよう 2 行まで許す */}
      <AppText style={styles.title} numberOfLines={2}>
        {title}
      </AppText>
      {/* タイトルを中央に保つための戻ると同幅のスペーサー */}
      <View style={styles.spacer} />
    </View>
  );
}

const BACK_WIDTH = 64;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.paper,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
    width: BACK_WIDTH,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.ink,
    flexShrink: 1,
  },
  spacer: {
    width: BACK_WIDTH,
  },
});
