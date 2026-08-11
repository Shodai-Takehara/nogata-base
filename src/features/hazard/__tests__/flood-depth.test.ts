import { floodRankFromColor } from '@/features/hazard/flood-depth';

describe('floodRankFromColor', () => {
  it('凡例の色がそのままランクに対応する', () => {
    expect(floodRankFromColor(0xf7, 0xf5, 0xa9, 255)).toEqual({
      label: '0.5m未満',
      arDepthM: 0.5,
    });
    expect(floodRankFromColor(0xff, 0xd8, 0xc0, 255)).toEqual({
      label: '0.5〜3m',
      arDepthM: 3.0,
    });
    expect(floodRankFromColor(0xff, 0xb7, 0xb7, 255)).toEqual({
      label: '3〜5m',
      arDepthM: 5.0,
    });
  });

  it('深いランクの AR 初期値はスライダー上限に収める', () => {
    expect(floodRankFromColor(0xff, 0x91, 0x91, 255)?.arDepthM).toBe(5.0);
    expect(floodRankFromColor(0xf2, 0x85, 0xc9, 255)?.arDepthM).toBe(5.0);
    expect(floodRankFromColor(0xdc, 0x7a, 0xdc, 255)?.arDepthM).toBe(5.0);
  });

  it('多少の色ずれ(アンチエイリアス等)は最寄りのランクに寄せる', () => {
    expect(floodRankFromColor(0xff, 0xb0, 0xb0, 255)?.label).toBe('3〜5m');
  });

  it('凡例から遠い色・透明ピクセルは「想定なし」', () => {
    expect(floodRankFromColor(0x00, 0xff, 0x00, 255)).toBeNull();
    expect(floodRankFromColor(0xff, 0xb7, 0xb7, 0)).toBeNull();
  });
});
