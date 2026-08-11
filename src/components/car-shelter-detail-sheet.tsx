import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { CarShelter } from '@/constants/car-shelters';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';
import { openRouteInMaps, openRouteToAddress } from '@/utils/route-link';

type Props = {
  shelter: CarShelter;
  onClose: () => void;
};

/**
 * 車中泊避難所ピンをタップしたときの詳細シート。
 * ネイティブの吹き出し(Callout)は New Architecture で開閉が不安定なため、
 * 避難所と同じ自前シートで出す。
 */
export function CarShelterDetailSheet({ shelter, onClose }: Props) {
  const copy = useCopy();
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{copy.carShelterBadge}</AppText>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.name}>{shelter.name}</AppText>
      <AppText style={styles.address}>{shelter.address}</AppText>
      {shelter.approxCoord ? (
        <AppText style={styles.approx}>{copy.carShelterApprox}</AppText>
      ) : null}

      {/* 静的データで開設状況を持たないため、開いている前提で向かわせない */}
      <AppText style={styles.note}>{copy.carShelterNote}</AppText>

      <Pressable
        style={styles.routeButton}
        accessibilityRole="button"
        accessibilityLabel={`${shelter.name}への経路を地図アプリで見る`}
        onPress={() =>
          // 概略座標の施設は、住所を地図アプリに解決させる方が正確
          shelter.approxCoord
            ? openRouteToAddress(shelter.address)
            : openRouteInMaps(shelter.coord, shelter.name)
        }>
        <AppText style={styles.routeText}>{copy.routeButton}</AppText>
      </Pressable>
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
  badge: {
    backgroundColor: AppColors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  approx: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 4,
  },
  note: {
    fontSize: 11,
    color: AppColors.caution,
    marginTop: 10,
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
