import { distanceWithWalk } from '@/state/distance-text';
import { PLAIN_JAPANESE_COPY } from '@/state/plain-japanese-copy';

// 入力の語はカタログから取り、期待値は目で読める形で固定する(カタログの語が変わったとき気づけるように)
const word = (key: 'approxPrefix' | 'walkPrefix' | 'unitMinutes', mode: 'standard' | 'easy') => {
  const entry: { standard: string; easy?: string } = PLAIN_JAPANESE_COPY[key];
  // 平易版が無い語は標準の語で読む(useCopy と同じ)
  return mode === 'easy' && entry.easy != null ? entry.easy : entry.standard;
};
const pick = (mode: 'standard' | 'easy') => ({
  approxPrefix: word('approxPrefix', mode),
  walkPrefix: word('walkPrefix', mode),
  unitMinutes: word('unitMinutes', mode),
});

describe('distanceWithWalk', () => {
  it('距離と徒歩分数の両方に「約」を付ける', () => {
    const copy = pick('standard');
    expect(distanceWithWalk(612, copy)).toBe('約 610m・徒歩 約 8分');
    expect(distanceWithWalk(1240, copy)).toBe('約 1.2km・徒歩 約 16分');
  });

  it('やさしい日本語の語でも同じ形に組む', () => {
    expect(distanceWithWalk(612, pick('easy'))).toBe('だいたい 610m・あるいて だいたい 8分');
  });

  it('壊れた距離は「—」だけにする(距離と分数で違う顔をしない)', () => {
    const copy = pick('standard');
    expect(distanceWithWalk(NaN, copy)).toBe('—');
    expect(distanceWithWalk(-1, copy)).toBe('—');
  });
});
