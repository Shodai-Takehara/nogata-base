import { formatBuiltYear } from '@/state/lore-detail';

describe('伝承碑の詳細の整形', () => {
  it('建立年は西暦なら「年」を付け、「不明」はそのまま出す', () => {
    expect(formatBuiltYear('1917')).toBe('1917年');
    expect(formatBuiltYear('不明')).toBe('不明');
    expect(formatBuiltYear('不明(1934？)')).toBe('不明(1934？)');
  });
});
