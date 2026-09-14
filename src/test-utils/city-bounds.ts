import type { LatLng } from '@/domain/models';

/** 直方市の行政区域の外接矩形(国土数値情報 N03 2025: 緯度 33.700〜33.796、経度 130.680〜130.806) */
export const CITY_BOUNDS = { minLat: 33.7, maxLat: 33.796, minLng: 130.68, maxLng: 130.806 };

/** 同梱データや模擬データの座標が市域の外に置かれていないことを確かめる */
export function expectInCity(coord: LatLng) {
  expect(coord.latitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLat);
  expect(coord.latitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLat);
  expect(coord.longitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLng);
  expect(coord.longitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLng);
}
