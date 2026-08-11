import { AR_UNAVAILABLE_MESSAGE, arAvailability } from '@/features/ar/availability';

describe('arAvailability', () => {
  it('実機+開発ビルドでのみ利用可能', () => {
    expect(arAvailability({ isRealDevice: true, isExpoGo: false })).toBe('available');
  });

  it('シミュレータでは実機を案内する(Expo Go かどうかより優先)', () => {
    expect(arAvailability({ isRealDevice: false, isExpoGo: false })).toBe('needs-device');
    expect(arAvailability({ isRealDevice: false, isExpoGo: true })).toBe('needs-device');
  });

  it('実機でも Expo Go では開発ビルドを案内する', () => {
    expect(arAvailability({ isRealDevice: true, isExpoGo: true })).toBe('needs-dev-build');
  });

  it('利用不可の各状態に案内文がある', () => {
    expect(AR_UNAVAILABLE_MESSAGE['needs-device']).toContain('実機');
    expect(AR_UNAVAILABLE_MESSAGE['needs-dev-build']).toContain('開発ビルド');
  });
});
