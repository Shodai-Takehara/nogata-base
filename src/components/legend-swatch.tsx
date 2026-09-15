import { PixelRatio, StyleSheet, View } from 'react-native';

import type { HazardLegendEntry } from '@/constants/hazard-map';

/** 見本に要るのは色だけ。ピンの色見本のように凡例の項目でないものも渡せるようにする */
export type SwatchEntry = Pick<HazardLegendEntry, 'color' | 'stripe'>;

type Props = {
  entry: SwatchEntry;
  size?: number;
  /** ピンの見本は丸、面の見本は四角にして、点と面の違いを見せる */
  round?: boolean;
};

/**
 * 凡例の色見本。地図の帯、レイヤー選択の行、シートの凡例で同じ見た目にする。
 * 縞の区分(旧河道、盛土地、河岸侵食)は地の色だけだと似た色の見本と見分けがつかないため、
 * 横縞を重ねる(地形分類のタイルは横縞、河岸侵食は斜線だが、見本は向きまで合わせない)
 */
export function LegendSwatch({ entry, size = 12, round }: Props) {
  return (
    <View
      style={[
        styles.swatch,
        { width: size, height: size, backgroundColor: entry.color },
        round && { borderRadius: size / 2 },
      ]}>
      {entry.stripe
        ? STRIPE_POSITIONS.map((top) => (
            <View
              key={top}
              style={[
                styles.stripe,
                // 画素に揃えないと、2本の縞が端末の倍率によって太さの違う線に描かれる
                {
                  top: PixelRatio.roundToNearestPixel(size * top),
                  height: Math.max(1, PixelRatio.roundToNearestPixel(size / STRIPE_DIVISOR)),
                },
                { backgroundColor: entry.stripe },
              ]}
            />
          ))
        : null}
    </View>
  );
}

/** 縞の上端の位置(見本の高さに対する割合)。2本で縞模様と分かる最少の本数 */
const STRIPE_POSITIONS = [0.25, 0.6] as const;
/** 縞の太さは見本の 1/6(11〜12pt の見本で 2pt)。それより細いと見本の枠線と区別しにくい */
const STRIPE_DIVISOR = 6;

const styles = StyleSheet.create({
  swatch: {
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
