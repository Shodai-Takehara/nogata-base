import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusChip } from '@/components/status-chip';
import { AppColors } from '@/constants/tokens';
import type { Shelter } from '@/domain/models';
import { SHELTER_OPENING_COLOR, isShelterOpen } from '@/domain/status';
import { useCopy, useStatusLabels } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';
import { formatJst } from '@/utils/datetime';
import { openRouteInMaps } from '@/utils/route-link';

type Props = {
  shelter: Shelter;
  onClose: () => void;
};

/** 地図の避難所ピンをタップしたときの詳細シート */
export function ShelterDetailSheet({ shelter, onClose }: Props) {
  const labels = useStatusLabels();
  const copy = useCopy();
  const easy = useEasyJapanese();
  const open = isShelterOpen(shelter.opening);
  const hazards = [
    { label: labels.hazardType.flood, ok: shelter.hazards.flood },
    { label: labels.hazardType.landslide, ok: shelter.hazards.landslide },
    { label: labels.hazardType.earthquake, ok: shelter.hazards.earthquake },
    { label: labels.hazardType.other, ok: shelter.hazards.other },
  ];

  const openRoute = () => openRouteInMaps(shelter.coord, shelter.name);

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <StatusChip
          label={labels.shelterOpening[shelter.opening]}
          color={SHELTER_OPENING_COLOR[shelter.opening]}
        />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.name}>{shelter.name}</AppText>
      {shelter.address ? <AppText style={styles.address}>{shelter.address}</AppText> : null}

      <View style={styles.stats}>
        {shelter.capacity != null ? (
          <Stat label={copy.statCapacity} value={`${shelter.capacity}`} unit={copy.unitPeople} />
        ) : null}
        {shelter.floorAreaM2 != null ? (
          <Stat
            label={copy.statFloorArea}
            value={`${shelter.floorAreaM2}`}
            unit={copy.unitSquareMeters}
          />
        ) : null}
        {open ? (
          <Stat
            label={copy.statEvacuating}
            value={`${shelter.families ?? '—'}`}
            unit={copy.unitHouseholds}
            sub={`${shelter.refugees ?? '—'}${copy.unitPeople}`}
          />
        ) : null}
      </View>
      {shelter.updatedAt != null ? (
        <AppText style={styles.updatedAt}>{formatJst(shelter.updatedAt, easy)}</AppText>
      ) : null}

      <AppText style={styles.sectionLabel}>{copy.sectionSupportedHazards}</AppText>
      <View style={styles.hazardRow}>
        {hazards.map((h) => (
          <View key={h.label} style={[styles.hazardTag, !h.ok && styles.hazardTagOff]}>
            <AppText style={[styles.hazardText, !h.ok && styles.hazardTextOff]}>
              {h.label} {h.ok ? '○' : '—'}
            </AppText>
          </View>
        ))}
      </View>

      {/* 閉鎖中は内訳が全て0で意味を持たないため、開設中のみ出す */}
      {open ? (
        <>
          <AppText style={styles.sectionLabel}>{copy.sectionEvacueeBreakdown}</AppText>
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <AppText style={[styles.breakdownLabel, styles.breakdownHead]}>
                {copy.breakdownAge}
              </AppText>
              <AppText style={[styles.breakdownValue, styles.breakdownHead]}>
                {copy.breakdownMale}
              </AppText>
              <AppText style={[styles.breakdownValue, styles.breakdownHead]}>
                {copy.breakdownFemale}
              </AppText>
            </View>
            {shelter.evacuees.map((row) => (
              <View key={row.bracket} style={styles.breakdownRow}>
                <AppText style={styles.breakdownLabel}>{labels.ageBracket[row.bracket]}</AppText>
                <AppText style={styles.breakdownValue}>{row.male ?? '—'}</AppText>
                <AppText style={styles.breakdownValue}>{row.female ?? '—'}</AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {shelter.tel ? (
        <AppText style={styles.tel}>
          {copy.telLabel}: {shelter.tel}
        </AppText>
      ) : null}

      <Pressable
        style={styles.routeButton}
        accessibilityRole="button"
        accessibilityLabel={`${shelter.name}への経路を地図アプリで見る`}
        onPress={openRoute}>
        <AppText style={styles.routeText}>{copy.routeButton}</AppText>
      </Pressable>
    </View>
  );
}

function Stat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statLabel}>{label}</AppText>
      <AppText style={styles.statValue}>
        {value}
        <AppText style={styles.statUnit}> {unit}</AppText>
        {sub ? <AppText style={styles.statSub}>{`  ${sub}`}</AppText> : null}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: '#14283C',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.line,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    fontSize: 15,
    color: AppColors.inkSub,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.ink,
    marginTop: 6,
  },
  address: {
    fontSize: 12,
    color: AppColors.inkSub,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: AppColors.paper,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 10,
    color: AppColors.inkSub,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: AppColors.inkSub,
  },
  statSub: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.ink,
  },
  updatedAt: {
    fontSize: 10,
    color: AppColors.inkSub,
    textAlign: 'right',
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 10,
    color: AppColors.inkSub,
    marginTop: 12,
    marginBottom: 5,
  },
  breakdown: {
    backgroundColor: AppColors.paper,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownLabel: {
    flex: 1.4,
    fontSize: 11,
    color: AppColors.inkSub,
  },
  breakdownValue: {
    flex: 1,
    fontSize: 12,
    color: AppColors.ink,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  breakdownHead: {
    fontSize: 9,
    fontWeight: '600',
    color: AppColors.inkSub,
  },
  hazardRow: {
    flexDirection: 'row',
    gap: 6,
  },
  hazardTag: {
    backgroundColor: '#E9F2EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  hazardTagOff: {
    backgroundColor: AppColors.paper,
  },
  hazardText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.ok,
  },
  hazardTextOff: {
    color: AppColors.none,
  },
  tel: {
    fontSize: 12,
    color: AppColors.ink,
    marginTop: 12,
  },
  routeButton: {
    marginTop: 12,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  routeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
