import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';

type Props = {
  color: string;
  dotColor: string;
  text: string;
};

/** デモモードとオフラインで共有する、画面上部の常時表示の帯 */
export function StatusBanner({ color, dotColor, text }: Props) {
  return (
    <View style={[styles.banner, { backgroundColor: color }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <AppText style={styles.text}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    // 折り返したとき、行の幅が丸印のぶん右へはみ出さないようにする
    flexShrink: 1,
  },
});
