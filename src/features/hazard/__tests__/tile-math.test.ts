import { latLngToTilePixel, TILE_SIZE } from '@/features/hazard/tile-math';

describe('latLngToTilePixel', () => {
  it('直方市中心部の z14 タイルが実在確認済みの座標になる', () => {
    // 2026-07-14 に配信サーバへの実リクエストで検証した組み合わせ
    const { tileX, tileY } = latLngToTilePixel(33.744, 130.729, 14);
    expect(tileX).toBe(14141);
    expect(tileY).toBe(6558);
  });

  it('原点(緯度経度0)は z1 で4タイルの境界に立つ', () => {
    const { tileX, tileY, pixelX, pixelY } = latLngToTilePixel(0, 0, 1);
    expect(tileX).toBe(1);
    expect(tileY).toBe(1);
    expect(pixelX).toBe(0);
    expect(pixelY).toBe(0);
  });

  it('ピクセル位置は常にタイルの範囲内に収まる', () => {
    for (const [lat, lng] of [
      [33.744, 130.729],
      [85.06, 179.9999],
      [-85.06, -179.9999],
      [90, 180],
      [-90, -180],
    ]) {
      const { pixelX, pixelY, tileX, tileY } = latLngToTilePixel(lat, lng, 17);
      expect(pixelX).toBeGreaterThanOrEqual(0);
      expect(pixelX).toBeLessThan(TILE_SIZE);
      expect(pixelY).toBeGreaterThanOrEqual(0);
      expect(pixelY).toBeLessThan(TILE_SIZE);
      expect(tileX).toBeGreaterThanOrEqual(0);
      expect(tileX).toBeLessThan(2 ** 17);
      expect(tileY).toBeGreaterThanOrEqual(0);
      expect(tileY).toBeLessThan(2 ** 17);
    }
  });
});
