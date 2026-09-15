import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { DemoBanner } from '@/components/demo-banner';
import { InfoTooltip } from '@/components/info-tooltip';
import { OfflineBanner } from '@/components/offline-banner';
import { LANDFORM_SOURCE } from '@/constants/hazard-map';
import { LORE_SOURCE } from '@/constants/lore-monuments';
import { AppColors, TAB_BAR_SPACE } from '@/constants/tokens';
import { WALK_GRAPH_ATTRIBUTION } from '@/constants/walk-graph';
import { DEMO_SCENARIO_COPY, useCopy } from '@/state/plain-japanese';
import { DEMO_SCENARIOS, TEXT_SIZES, useSettings, type TextSize } from '@/state/settings';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, update } = useSettings();
  const copy = useCopy();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DemoBanner />
      <OfflineBanner />
      <AppText style={styles.screenTitle}>{copy.moreScreenTitle}</AppText>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        <AppText style={styles.caption}>{copy.captionPrepare}</AppText>
        <View style={styles.card}>
          {/* 災害時に最初に要る入口なので、カードの先頭に置く */}
          <Pressable style={styles.rowBetween} onPress={() => router.push('/official-info')}>
            <AppText style={styles.rowTitle}>{copy.rowOfficialInfo}</AppText>
            <AppText style={styles.arrow}>›</AppText>
          </Pressable>
          <Separator />
          <Pressable style={styles.rowBetween} onPress={() => router.push('/ar')}>
            <AppText style={styles.rowTitle}>{copy.arTitle}</AppText>
            <AppText style={styles.arrow}>›</AppText>
          </Pressable>
          <Separator />
          <Pressable style={styles.rowBetween} onPress={() => router.push('/home-pin')}>
            <AppText style={styles.rowTitle}>{copy.rowHomePin}</AppText>
            <View style={styles.rowRight}>
              {settings.homePin ? (
                <AppText style={styles.rowState}>{copy.homePinConfigured}</AppText>
              ) : null}
              <AppText style={styles.arrow}>›</AppText>
            </View>
          </Pressable>
          <Separator />
          <Pressable style={styles.rowBetween} onPress={() => router.push('/disaster-wifi')}>
            <View style={styles.rowLeft}>
              <AppText style={styles.rowTitle}>{copy.rowDisasterWifi}</AppText>
              {/* 名前を知らない人に向けた機能のため、行を開かなくても何かが分かるようにする */}
              <InfoTooltip text={copy.disasterWifiTooltip} />
            </View>
            <View style={styles.rowRight}>
              <AppText style={styles.rowState}>{copy.disasterWifiSsid}</AppText>
              <AppText style={styles.arrow}>›</AppText>
            </View>
          </Pressable>
        </View>

        <AppText style={styles.caption}>{copy.captionApp}</AppText>
        <View style={styles.card}>
          <View style={styles.segmentRow}>
            <AppText style={styles.rowTitle}>{copy.rowTextSize}</AppText>
            <View style={styles.segment}>
              {TEXT_SIZES.map((size) => (
                <SegmentButton
                  key={size}
                  label={textSizeLabel(size, copy)}
                  accessibilityLabel={`${copy.rowTextSize}: ${textSizeLabel(size, copy)}`}
                  active={settings.textSize === size}
                  onPress={() => update({ textSize: size })}
                />
              ))}
            </View>
          </View>
          <Separator />
          <View style={styles.rowBetween}>
            {/* 外国語話者にも切替と分かるよう、ラベル自体をやさしい日本語で書く */}
            <AppText style={styles.rowTitle}>{copy.rowEasyJapanese}</AppText>
            <Switch
              value={settings.easyJapanese}
              onValueChange={(v) => update({ easyJapanese: v })}
              trackColor={{ true: AppColors.primary }}
            />
          </View>
          <Separator />
          <View style={styles.rowBetween}>
            <AppText style={styles.rowTitle}>{copy.rowDemoMode}</AppText>
            <Switch
              value={settings.demoMode}
              onValueChange={(v) => update({ demoMode: v })}
              trackColor={{ true: AppColors.demo }}
            />
          </View>
          {/* デモモードが切のときは意味を持たない選択なので、行ごと出さない */}
          {settings.demoMode ? (
            <>
              <Separator />
              <View style={styles.segmentRow}>
                <AppText style={styles.rowTitle}>{copy.rowDemoScenario}</AppText>
                <View style={styles.segment}>
                  {DEMO_SCENARIOS.map((scenario) => (
                    <SegmentButton
                      key={scenario}
                      label={copy[DEMO_SCENARIO_COPY[scenario].label]}
                      accessibilityLabel={`${copy.rowDemoScenario}: ${copy[DEMO_SCENARIO_COPY[scenario].label]}`}
                      active={settings.demoScenario === scenario}
                      onPress={() => update({ demoScenario: scenario })}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </View>
        <AppText style={styles.note}>{copy.demoNote}</AppText>

        <AppText style={styles.caption}>{copy.captionCredits}</AppText>
        <View style={styles.card}>
          <AppText style={styles.legal}>
            避難所・水位・被害・交通規制のデータ: 直方市 災害時情報共有PF(公開用)
          </AppText>
          <Separator />
          <AppText style={styles.legal}>
            浸水想定・土砂災害・家屋倒壊の区域:
            重ねるハザードマップ(ハザードマップポータルサイト、国土交通省)
          </AppText>
          <Separator />
          <AppText style={styles.legal}>
            人口データ: 国土数値情報
            500mメッシュ別将来推計人口(国土交通省。2020年国勢調査をもとにした推計)を加工して作成
          </AppText>
          <Separator />
          <AppText style={styles.legal}>
            地域名: 令和2年国勢調査 小地域境界データ(政府統計の総合窓口(e-Stat))を加工して作成
          </AppText>
          <Separator />
          <AppText style={styles.legal}>
            地震ハザード: J-SHIS 地震ハザードステーション(防災科学技術研究所)2024年基準
            NIED作成版を加工して作成
          </AppText>
          <Separator />
          <AppText style={styles.legal}>
            福智山断層帯の規模と発生確率: 地震調査研究推進本部 長期評価
          </AppText>
          <Separator />
          <AppText style={styles.legal}>地形の分類: {LANDFORM_SOURCE}</AppText>
          <Separator />
          <AppText style={styles.legal}>自然災害伝承碑: {LORE_SOURCE}</AppText>
          <Separator />
          <AppText style={styles.legal}>{WALK_GRAPH_ATTRIBUTION}</AppText>
          <Separator />
          <AppText style={styles.legal}>{copy.disclaimerNotOfficial}</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

/** 設定値と文言カタログの対応。TextSize の選択肢が増えたらここに足す */
function textSizeLabel(size: TextSize, copy: ReturnType<typeof useCopy>): string {
  switch (size) {
    case 'standard':
      return copy.textSizeStandard;
    case 'large':
      return copy.textSizeLarge;
    case 'xlarge':
      return copy.textSizeXLarge;
  }
}

function SegmentButton({
  label,
  accessibilityLabel,
  active,
  onPress,
}: {
  label: string;
  /** 読み上げでは選択肢名だけだと何の設定か分からないため、設定名を含めて渡す(平易版も文言カタログから組む) */
  accessibilityLabel: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segmentItem, active && styles.segmentItemActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={accessibilityLabel}>
      <AppText style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</AppText>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.paper,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    paddingHorizontal: 14,
  },
  caption: {
    fontSize: 11,
    color: AppColors.inkSub,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.ink,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowState: {
    fontSize: 11,
    color: AppColors.inkSub,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.line,
  },
  // 特大文字ややさしい日本語で題と選択肢が1行に収まらないとき、選択肢を次の行へ落とす
  // (カードの右へはみ出して押せなくなるより良い)。落ちた行でも右寄せにする
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: 8,
    paddingVertical: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: AppColors.paper,
    borderRadius: 999,
    padding: 3,
    marginLeft: 'auto',
  },
  segmentItem: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  segmentItemActive: {
    backgroundColor: AppColors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.inkSub,
  },
  segmentTextActive: {
    color: '#fff',
  },
  arrow: {
    fontSize: 18,
    color: '#C4C9CD',
  },
  note: {
    fontSize: 10,
    color: AppColors.inkSub,
    marginTop: 5,
    marginLeft: 6,
  },
  legal: {
    fontSize: 11,
    color: AppColors.inkSub,
    lineHeight: 17,
    paddingVertical: 10,
  },
});
