import { formatJst, toEpochMs } from '@/utils/datetime';

describe('toEpochMs', () => {
  it('正のエポックms はそのまま返す', () => {
    expect(toEpochMs(1_752_000_000_000)).toBe(1_752_000_000_000);
  });

  it('未入力(エポック0)は欠測として null にする', () => {
    // 公式ダッシュボードで 1970/01/01 と表示される行の再現防止
    expect(toEpochMs(0)).toBeNull();
  });

  it('負値・非数・欠損は null にする', () => {
    expect(toEpochMs(-1)).toBeNull();
    expect(toEpochMs(NaN)).toBeNull();
    expect(toEpochMs('1752000000000')).toBeNull();
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs(undefined)).toBeNull();
  });
});

describe('formatJst', () => {
  it('JST に変換し「〜時点」を付けて返す', () => {
    // 2026-07-14T12:28:00Z = JST 21:28。月日の表記(7月14日/7/14)は
    // 実行環境の ICU に依存するため、時刻と接尾辞だけを固定で検証する
    expect(formatJst(Date.UTC(2026, 6, 14, 12, 28))).toMatch(/21:28 時点$/);
  });

  it('欠測は「不明」', () => {
    expect(formatJst(null)).toBe('不明');
  });
});
