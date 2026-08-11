import AsyncStorage from '@react-native-async-storage/async-storage';

import { readCache, writeCache } from '@/data/cache-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  // jest.mock のファクトリは巻き上げられるため、import ではなく require しか使えない
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('cache-store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('書いたデータを取得時刻つきで読み戻せる', async () => {
    writeCache('shelters', [{ id: 1 }]);
    // writeCache は投げっぱなしのため、書き込み完了を待つ
    await new Promise((r) => setTimeout(r, 0));
    const cached = await readCache<{ id: number }[]>('shelters');
    expect(cached?.data).toEqual([{ id: 1 }]);
    expect(typeof cached?.fetchedAt).toBe('number');
  });

  it('存在しないキーは null', async () => {
    expect(await readCache('missing')).toBeNull();
  });

  it('壊れた JSON は null(クラッシュさせない)', async () => {
    await AsyncStorage.setItem('nogata.cache.v1.broken', '{oops');
    expect(await readCache('broken')).toBeNull();
  });

  it('形の違うデータ(旧スキーマ等)は null', async () => {
    await AsyncStorage.setItem('nogata.cache.v1.old', JSON.stringify({ data: [] }));
    expect(await readCache('old')).toBeNull();
  });
});
