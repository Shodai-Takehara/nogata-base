import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

const BALLOON_WIDTH = 268;
const SCREEN_MARGIN = 12;
const CARET_SIZE = 6;
/** ⓘ と吹き出しの間隔。三角の分だけ空ける */
const ANCHOR_GAP = 6;

type Anchor = { x: number; y: number; width: number; height: number };

type Props = {
  /** 1〜2行で収まる短い説明。長い案内は詳細画面側に置く */
  text: string;
};

/**
 * ⓘ を押すと短い説明を吹き出しで出す。
 * 画面遷移する行の中に置くため、行とは別の当たり判定を持つ Pressable にしている。
 */
export function InfoTooltip({ text }: Props) {
  const copy = useCopy();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const buttonRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // 高さが分かるまで上下どちらに出すか決められないため、実測を待って配置する
  const [balloonHeight, setBalloonHeight] = useState<number | null>(null);

  const open = useCallback(() => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setBalloonHeight(null);
      setAnchor({ x, y, width, height });
    });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  const anchorCenterX = anchor ? anchor.x + anchor.width / 2 : 0;
  const left = clamp(
    anchorCenterX - BALLOON_WIDTH / 2,
    SCREEN_MARGIN,
    screenWidth - BALLOON_WIDTH - SCREEN_MARGIN,
  );
  // 下に出すと画面外へはみ出すときだけ上に返す
  const below =
    anchor == null ||
    balloonHeight == null ||
    anchor.y + anchor.height + ANCHOR_GAP + balloonHeight + SCREEN_MARGIN <= screenHeight;
  const top = anchor
    ? below
      ? anchor.y + anchor.height + ANCHOR_GAP
      : anchor.y - ANCHOR_GAP - (balloonHeight ?? 0)
    : 0;
  const caretLeft = clamp(
    anchorCenterX - left - CARET_SIZE,
    CARET_SIZE,
    BALLOON_WIDTH - CARET_SIZE * 3,
  );

  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={open}
        // 字が小さいため、指の当たり判定を 44pt 目安まで広げる
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel={copy.a11yShowDescription}>
        <AppText style={styles.icon} maxScale={1.2}>
          ⓘ
        </AppText>
      </Pressable>

      <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          {/* 閉じる操作と本文を入れ子にすると、読み上げが本文に届かなくなるため兄弟に置く */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={copy.close}
          />
          {anchor ? (
            <View
              accessible
              accessibilityRole="text"
              style={[styles.balloon, { left, top }, balloonHeight == null && styles.measuring]}
              onLayout={(e) => setBalloonHeight(e.nativeEvent.layout.height)}>
              <View style={[below ? styles.caretUp : styles.caretDown, { left: caretLeft }]} />
              <AppText style={styles.text}>{text}</AppText>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 14,
    color: AppColors.inkSub,
  },
  overlay: {
    flex: 1,
  },
  balloon: {
    position: 'absolute',
    width: BALLOON_WIDTH,
    backgroundColor: AppColors.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#14283C',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  /** 実測前の1フレームを見せない */
  measuring: {
    opacity: 0,
  },
  caretUp: {
    position: 'absolute',
    top: -CARET_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: CARET_SIZE,
    borderRightWidth: CARET_SIZE,
    borderBottomWidth: CARET_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: AppColors.ink,
  },
  caretDown: {
    position: 'absolute',
    bottom: -CARET_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: CARET_SIZE,
    borderRightWidth: CARET_SIZE,
    borderTopWidth: CARET_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: AppColors.ink,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    color: '#fff',
  },
});
