import { isOffline } from '@/state/network';

describe('isOffline', () => {
  it('判定前(値が無い)はオンライン扱いにして、起動直後に帯を出さない', () => {
    expect(isOffline({})).toBe(false);
    expect(isOffline({ isConnected: true })).toBe(false);
  });

  it('経路が無いか、届かないと報告されたらオフライン', () => {
    expect(isOffline({ isConnected: false, isInternetReachable: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
    expect(isOffline({ isConnected: false })).toBe(true);
  });

  it('つながっていて届く報告ならオンライン', () => {
    expect(isOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
  });
});
