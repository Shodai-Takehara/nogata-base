import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { DemoBanner } from '@/components/demo-banner';
import { ShelterDetailSheet } from '@/components/shelter-detail-sheet';
import { StatusChip } from '@/components/status-chip';
import { AppColors, TAB_BAR_SPACE } from '@/constants/tokens';
import type { DataSource } from '@/data/types';
import type { Shelter } from '@/domain/models';
import { shelterDistances, sortSheltersForList } from '@/domain/shelter-order';
import {
  filterSheltersByHazards,
  HAZARD_TYPE_LABEL,
  HAZARD_TYPES,
  isShelterOpen,
  SHELTER_OPENING_COLOR,
  type HazardType,
} from '@/domain/status';
import { useRemoteData } from '@/hooks/use-remote-data';
import { useCopy, useStatusLabels } from '@/state/plain-japanese';
import { useEasyJapanese, useHomePin } from '@/state/settings';
import { formatJstMoment } from '@/utils/datetime';

const loadShelters = (source: DataSource) => source.fetchShelters();

export default function SheltersScreen() {
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const labels = useStatusLabels();
  const easy = useEasyJapanese();
  const [selectedHazards, setSelectedHazards] = useState<HazardType[]>([]);
  // 選択は id で保持し、表示は最新データから解決する(更新でシートが古くならないように)
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);

  const { data, loading, error, refresh, fetchedAt } = useRemoteData(loadShelters, 'shelters');

  const toggleHazard = useCallback((hazard: HazardType) => {
    setSelectedHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard],
    );
  }, []);

  const selectShelter = useCallback((id: number) => {
    setSelectedShelterId(id);
  }, []);

  const selectedShelter = data?.find((s) => s.id === selectedShelterId) ?? null;

  const homePin = useHomePin();
  const distanceById = useMemo(
    () => (data ? shelterDistances(data, homePin) : null),
    [data, homePin],
  );

  const shown = useMemo(() => {
    if (!data) return [];
    return sortSheltersForList(filterSheltersByHazards(data, selectedHazards), distanceById);
  }, [data, selectedHazards, distanceById]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DemoBanner />
      <AppText style={styles.screenTitle}>{copy.sheltersScreenTitle}</AppText>

      {/* ラベルとチップを横並びにすると、特大×やさしい日本語で幅が足りず
          はみ出すため縦に積む(チップの折り返し幅を全幅確保する) */}
      <View style={styles.filterBlock}>
        <AppText style={styles.filterLabel}>{copy.shelterFilterLabel}</AppText>
        <View style={styles.filterChips}>
          {HAZARD_TYPES.map((h) => (
            <FilterChip
              key={h}
              label={labels.hazardType[h]}
              active={selectedHazards.includes(h)}
              onPress={() => toggleHazard(h)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ShelterRow item={item} onSelect={selectShelter} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            {data ? (
              <AppText style={styles.headline}>
                {selectedHazards.length > 0
                  ? `${selectedHazards.map((h) => HAZARD_TYPE_LABEL[h]).join('・')}に対応 ${shown.length}箇所`
                  : `市内の避難所 ${data.length}箇所`}
                {distanceById ? copy.sortedByHomeSuffix : ''}
              </AppText>
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
          loading || error ? null : (
            <AppText style={styles.empty}>
              {selectedHazards.length > 0 ? copy.listEmptyShelterFiltered : copy.listEmptyShelter}
            </AppText>
          )
        }
      />

      {selectedShelter ? (
        <View style={[styles.sheetWrap, { bottom: insets.bottom + 8 }]}>
          <ShelterDetailSheet
            shelter={selectedShelter}
            onClose={() => setSelectedShelterId(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}に対応する避難所でしぼる`}>
      <AppText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const ShelterRow = memo(function ShelterRow({
  item,
  onSelect,
}: {
  item: Shelter;
  onSelect: (id: number) => void;
}) {
  const labels = useStatusLabels();
  const open = isShelterOpen(item.opening);
  return (
    <Pressable
      style={[styles.row, !open && styles.rowClosed]}
      onPress={() => onSelect(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の詳細を見る`}>
      <View style={styles.rowTop}>
        <AppText style={[styles.name, !open && styles.nameClosed]} numberOfLines={1}>
          {item.name}
        </AppText>
        <StatusChip
          label={labels.shelterOpening[item.opening]}
          color={SHELTER_OPENING_COLOR[item.opening]}
        />
        <AppText style={styles.rowArrow}>›</AppText>
      </View>
      {item.address ? <AppText style={styles.address}>{item.address}</AppText> : null}
      {open ? (
        <AppText style={styles.stats}>
          {/* 欠損は 0(誰もいない)と区別して — で示す */}
          {item.families ?? '—'}世帯 {item.refugees ?? '—'}人が避難中
          {item.capacity != null ? ` ・ 収容目安 ${item.capacity}人` : ''}
        </AppText>
      ) : item.capacity != null ? (
        // 閉鎖中でも避難所選びの目安になるため収容人数は出す
        <AppText style={styles.stats}>収容目安 {item.capacity}人</AppText>
      ) : null}
      <View style={styles.tags}>
        {item.hazards.flood ? <HazardTag label={labels.hazardType.flood} /> : null}
        {item.hazards.landslide ? <HazardTag label={labels.hazardType.landslide} /> : null}
        {item.hazards.earthquake ? <HazardTag label={labels.hazardType.earthquake} /> : null}
        {item.hazards.other ? <HazardTag label={labels.hazardType.other} /> : null}
      </View>
    </Pressable>
  );
});

function HazardTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <AppText style={styles.tagText}>{label} ○</AppText>
    </View>
  );
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
  filterBlock: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: AppColors.inkSub,
  },
  filterChips: {
    flexDirection: 'row',
    // 文字サイズを大きくしても4チップが収まるよう折り返しを許す
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.line,
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.inkSub,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  headline: {
    fontSize: 13,
    color: AppColors.inkSub,
    paddingVertical: 4,
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
  rowClosed: {
    opacity: 0.75,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowArrow: {
    fontSize: 16,
    color: '#C4C9CD',
  },
  sheetWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.ink,
  },
  nameClosed: {
    color: AppColors.inkSub,
  },
  address: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 2,
  },
  stats: {
    fontSize: 12,
    color: AppColors.ink,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: '#E9F2EE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.ok,
  },
});
