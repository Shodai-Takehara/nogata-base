import { DISTANCE_COPY_KEYS, distanceWithWalk, type DistanceCopy } from '@/state/distance-text';
import { PLAIN_JAPANESE_COPY } from '@/state/plain-japanese-copy';

// 入力の語はカタログから取り、期待値は目で読める形で固定する(カタログの語が変わったとき気づけるように)
const pick = (mode: 'standard' | 'easy'): DistanceCopy => {
  const out = {} as DistanceCopy;
  for (const key of DISTANCE_COPY_KEYS) {
    const entry: { standard: string; easy?: string } = PLAIN_JAPANESE_COPY[key];
    // 平易版が無い語は標準の語で読む(useCopy と同じ)
    out[key] = mode === 'easy' && entry.easy != null ? entry.easy : entry.standard;
  }
  return out;
};

describe('distanceWithWalk', () => {
  it('道のりは「道のり」と添え、分数は下限として「以上」を付ける', () => {
    const copy = pick('standard');
    expect(distanceWithWalk({ meters: 652, measured: 'road' }, copy)).toBe(
      '道のり 約 650m・徒歩 8分以上',
    );
    expect(distanceWithWalk({ meters: 1240, measured: 'road' }, copy)).toBe(
      '道のり 約 1.2km・徒歩 15分以上',
    );
  });

  it('道に落とせず直線で補ったときは「直線」と添える', () => {
    expect(distanceWithWalk({ meters: 612, measured: 'straight' }, pick('standard'))).toBe(
      '直線距離 約 610m・徒歩 7分以上',
    );
  });

  it('やさしい日本語の語でも同じ形に組む', () => {
    expect(distanceWithWalk({ meters: 652, measured: 'road' }, pick('easy'))).toBe(
      '道(みち)のり だいたい 650m・あるいて 8分より 長(なが)く かかります',
    );
  });

  it('壊れた距離は「—」だけにする(距離と分数で違う顔をしない)', () => {
    const copy = pick('standard');
    expect(distanceWithWalk({ meters: NaN, measured: 'road' }, copy)).toBe('—');
    expect(distanceWithWalk({ meters: -1, measured: 'straight' }, copy)).toBe('—');
  });
});
