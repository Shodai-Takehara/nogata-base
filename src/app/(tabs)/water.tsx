import { memo, useMemo } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { DemoBanner } from '@/components/demo-banner';
import { StatusChip } from '@/components/status-chip';
import { RIVER_INFO_URL } from '@/constants/links';
import { AppColors, TAB_BAR_SPACE } from '@/constants/tokens';
import type { DataSource } from '@/data/types';
import type { WaterLevel } from '@/domain/models';
import { waterStatus, WATER_STATUS_COLOR, type WaterStatus } from '@/domain/status';
import { useRemoteData } from '@/hooks/use-remote-data';
import { useCopy, useStatusLabels } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';
import { formatJst, formatJstMoment } from '@/utils/datetime';
import { openExternalUrl } from '@/utils/external-link';

/** 危険度の高い地点が先に目に入るようにするための並び順 */
const STATUS_ORDER: Record<WaterStatus, number> = {
  danger: 0,
  caution: 1,
  normal: 2,
  unknown: 3,
};

const loadWaterLevels = (source: DataSource) => source.fetchWaterLevels();

export default function WaterScreen() {
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const labels = useStatusLabels();
  const easy = useEasyJapanese();

  const { data, loading, error, refresh, fetchedAt } = useRemoteData(
    loadWaterLevels,
    'water-levels',
  );

  // 元ダッシュボードと同じく水位センサーと転倒ゲートを別グループで見せる
  const sections = useMemo(() => {
    if (!data) return [];
    const byStatusThenName = (a: WaterLevel, b: WaterLevel) => {
      const sa = STATUS_ORDER[waterStatus(a.levelCm, a.alertLevelCm)];
      const sb = STATUS_ORDER[waterStatus(b.levelCm, b.alertLevelCm)];
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, 'ja');
    };
    const groups: { title: string; kind: WaterLevel['kind'] }[] = [
      { title: labels.waterKind.sensor, kind: 'sensor' },
      { title: labels.waterKind.gate, kind: 'gate' },
    ];
    return groups
      .map((g) => ({
        title: g.title,
        data: data.filter((w) => w.kind === g.kind).sort(byStatusThenName),
      }))
      .filter((s) => s.data.length > 0);
  }, [data, labels.waterKind]);

  const headline = useMemo(() => {
    if (!data) return null;
    const statuses = data.map((w) => waterStatus(w.levelCm, w.alertLevelCm));
    const dangers = statuses.filter((s) => s === 'danger').length;
    const cautions = statuses.filter((s) => s === 'caution').length;
    const unknowns = statuses.filter((s) => s === 'unknown').length;
    if (dangers > 0) return { text: `${dangers}地点で警戒水位を超過`, color: AppColors.danger };
    if (cautions > 0) return { text: `${cautions}地点で注意`, color: AppColors.caution };
    // 全地点欠測なのに「平常」と見せない
    if (unknowns > 0) return { text: `${unknowns}地点で観測値なし`, color: AppColors.inkSub };
    return { text: `全${data.length}地点 平常`, color: AppColors.primary };
  }, [data]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DemoBanner />
      <AppText style={styles.screenTitle}>{copy.waterScreenTitle}</AppText>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WaterRow item={item} />}
        renderSectionHeader={({ section }) => (
          <AppText style={styles.sectionHeader}>
            {section.title}({section.data.length})
          </AppText>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            {headline ? (
              <View style={[styles.headline, { backgroundColor: headline.color }]}>
                <AppText style={styles.headlineText}>{headline.text}</AppText>
                <AppText style={styles.headlineSub}>{copy.waterHeadlineSub}</AppText>
              </View>
            ) : null}
            {error ? <AppText style={styles.error}>{copy.listLoadError}</AppText> : null}
            {/* 圏外などでキャッシュを見せているときは、いつの情報かを明示する */}
            {error && data && fetchedAt != null ? (
              <AppText style={styles.cachedAt}>
                {formatJstMoment(fetchedAt, easy)}
                {copy.cachedAsOf}
              </AppText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          // エラー時は取得失敗メッセージが出るため、空状態と二重に出さない
          loading || error ? null : <AppText style={styles.empty}>{copy.listEmptyWater}</AppText>
        }
        ListFooterComponent={
          <Pressable style={styles.linkCard} onPress={() => openExternalUrl(RIVER_INFO_URL)}>
            <View>
              <AppText style={styles.linkTitle}>{copy.riverInfoLabel}</AppText>
              <AppText style={styles.linkSub}>{copy.riverInfoSub}</AppText>
            </View>
            <AppText style={styles.linkArrow}>↗</AppText>
          </Pressable>
        }
      />
    </View>
  );
}

const WaterRow = memo(function WaterRow({ item }: { item: WaterLevel }) {
  const labels = useStatusLabels();
  const copy = useCopy();
  const easy = useEasyJapanese();
  const status = waterStatus(item.levelCm, item.alertLevelCm);
  // 負の観測値(欠測コード等)でバー幅が負にならないよう 0..1 に収める
  const ratio =
    item.levelCm != null && item.alertLevelCm != null && item.alertLevelCm > 0
      ? Math.max(0, Math.min(item.levelCm / item.alertLevelCm, 1))
      : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <AppText style={styles.name}>{item.name}</AppText>
        <StatusChip label={labels.water[status]} color={WATER_STATUS_COLOR[status]} />
      </View>
      <AppText style={styles.values}>
        {copy.waterNowLabel} {item.levelCm ?? '—'}cm / {copy.waterAlertLabel}{' '}
        {item.alertLevelCm ?? '—'}cm ・ {formatJst(item.measuredAt, easy)}
      </AppText>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${ratio * 100}%`, backgroundColor: WATER_STATUS_COLOR[status] },
          ]}
        />
      </View>
    </View>
  );
});

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
  listContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.ink,
    marginTop: 4,
    marginBottom: 2,
    marginLeft: 2,
  },
  headline: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  headlineText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  headlineSub: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 11,
    marginTop: 2,
  },
  error: {
    color: AppColors.danger,
    fontSize: 12,
    paddingVertical: 6,
  },
  cachedAt: {
    color: AppColors.inkSub,
    fontSize: 11,
    paddingBottom: 6,
  },
  empty: {
    color: AppColors.inkSub,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 32,
  },
  row: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.ink,
  },
  values: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 2,
    marginBottom: 6,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: AppColors.paper,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary,
  },
  linkSub: {
    fontSize: 10,
    color: AppColors.inkSub,
    marginTop: 1,
  },
  linkArrow: {
    fontSize: 16,
    color: AppColors.primary,
  },
});
