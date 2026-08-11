import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTextScale } from '@/state/settings';

/** fontSize 未指定の Text に適用される RN の既定値。倍率の掛け先を揃えるために持つ */
const BASE_FONT_SIZE = 14;

type AppTextProps = TextProps & {
  /**
   * 拡大倍率の上限。地図上の凡例パネルなど面積が限られる部品で、
   * 特大設定でも操作を潰さないために使う。未指定は設定どおり拡大する
   */
  maxScale?: number;
};

/**
 * 設定「文字サイズ」を反映する Text。画面内の文字は原則こちらを使う。
 * 例外は地図上の丸ボタンや AR の閉じるボタンなど大きさ固定の部品で、
 * 拡大するとはみ出すため素の Text のままにしている。
 */
export function AppText({ style, maxScale, ...rest }: AppTextProps) {
  const scale = Math.min(useTextScale(), maxScale ?? Number.POSITIVE_INFINITY);
  if (scale === 1) return <Text style={style} {...rest} />;
  const flat = StyleSheet.flatten(style);
  return (
    <Text
      {...rest}
      style={[
        style,
        {
          fontSize: (flat?.fontSize ?? BASE_FONT_SIZE) * scale,
          // 行間を据え置いたまま文字だけ大きくすると行が重なるため、同じ倍率で広げる
          lineHeight: flat?.lineHeight != null ? flat.lineHeight * scale : undefined,
        },
      ]}
    />
  );
}
