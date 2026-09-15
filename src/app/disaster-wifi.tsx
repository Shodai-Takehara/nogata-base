import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

/**
 * 災害用統一SSID「00000JAPAN」の案内。
 * iOS はアプリから Wi-Fi への接続も SSID の検索もできないため、
 * 自動接続は持たず、存在とつなぎ方と注意点を伝える画面にしている。
 *
 * 設定アプリの Wi-Fi 画面を開くボタンも置かない。`App-Prefs:root=WIFI` は
 * iOS 18 以降どのアプリからも開けず、公開 API で開けるのはアプリ自身の
 * 設定画面だけで、そこへ送ると利用者が迷う(2026-08-09 に実機で確認)。
 */
export default function DisasterWifiScreen() {
  const insets = useSafeAreaInsets();
  const copy = useCopy();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={copy.rowDisasterWifi} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Wi-Fi 一覧で探す文字列そのものを見せるのが、この画面の主目的 */}
        <View style={styles.ssidCard}>
          <AppText style={styles.ssid}>{copy.disasterWifiSsid}</AppText>
        </View>

        <AppText style={styles.lead}>{copy.disasterWifiLead}</AppText>

        <AppText style={styles.caption}>{copy.disasterWifiStepsTitle}</AppText>
        <View style={styles.card}>
          <Step number={1} text={copy.disasterWifiStep1} />
          <Separator />
          <Step number={2} text={copy.disasterWifiStep2} />
          <Separator />
          <Step number={3} text={copy.disasterWifiStep3} />
        </View>

        <View style={styles.cautionBox}>
          <AppText style={styles.cautionText}>{copy.disasterWifiCaution}</AppText>
        </View>

        <AppText style={styles.note}>{copy.disasterWifiNote}</AppText>
      </ScrollView>
    </View>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <AppText style={styles.stepNumber} maxScale={1.2}>
          {number}
        </AppText>
      </View>
      <AppText style={styles.stepText}>{text}</AppText>
    </View>
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
  content: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  ssidCard: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ssid: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  lead: {
    fontSize: 13,
    lineHeight: 21,
    color: AppColors.ink,
    marginTop: 14,
    marginHorizontal: 2,
  },
  caption: {
    fontSize: 11,
    color: AppColors.inkSub,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: AppColors.ink,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.line,
  },
  cautionBox: {
    marginTop: 20,
    backgroundColor: '#FDF4EC',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.caution,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cautionText: {
    fontSize: 12,
    lineHeight: 19,
    color: AppColors.ink,
  },
  note: {
    fontSize: 11,
    lineHeight: 17,
    color: AppColors.inkSub,
    marginTop: 14,
    marginHorizontal: 4,
  },
});
