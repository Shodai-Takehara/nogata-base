import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import type { Shelter } from '@/domain/models';
import { HAZARD_TYPE_LABEL, HAZARD_TYPES, partitionHazards } from '@/domain/status';
import { useStatusLabels } from '@/state/plain-japanese';

type Props = {
  hazards: Shelter['hazards'];
  /** 一覧の行では小さく、詳細シートでは読みやすい大きさにする */
  size?: 'small' | 'regular';
  /**
   * 自分を1つの読み上げ単位にするか。一覧の行のように親が読み上げ文を持つ場所では
   * 入れ子の単位を作らない(Android では親と別に止まってしまう)
   */
  spoken?: boolean;
};

/**
 * 避難所が対応する災害種別のタグ。4種別を常に並べ、対応しない種別は灰色に「—」を添える。
 * 対応する種別だけ並べると、地震に対応しない避難所がそれと分からないため
 */
export function HazardTags({ hazards, size = 'regular', spoken = false }: Props) {
  const labels = useStatusLabels();
  const small = size === 'small';
  // 読み上げは「水害 ○」の記号を読ませず、対応する種別の名前だけにする。
  // 平易版の読み(括弧)を二重に読ませないよう標準の名前を使う
  const spokenLabel = spoken
    ? partitionHazards(hazards)
        .supported.map((h) => HAZARD_TYPE_LABEL[h])
        .join('、') || 'なし'
    : undefined;
  return (
    <View style={styles.row} accessible={spoken} accessibilityLabel={spokenLabel}>
      {HAZARD_TYPES.map((h) => {
        const ok = hazards[h];
        return (
          <View key={h} style={[styles.tag, small && styles.tagSmall, !ok && styles.tagOff]}>
            <AppText style={[styles.text, small && styles.textSmall, !ok && styles.textOff]}>
              {labels.hazardType[h]} {ok ? '○' : '—'}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // 特大文字ややさしい日本語(読み付きで長い)で4つが1行に収まらないときは折り返す
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#E9F2EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagOff: {
    backgroundColor: AppColors.paper,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.ok,
  },
  textSmall: {
    fontSize: 10,
  },
  // 「なし」の灰(none)は薄い地の上では読めない(1.75:1)ため、文字は本文の副色にする
  textOff: {
    color: AppColors.inkSub,
  },
});
