import { withMinInterval } from '@/data/throttle';
import type { DataSource } from '@/data/types';

/** 時計を手で進められる now と、呼び出し回数を数えるソースを作る */
function setup(intervalMs = 60_000) {
  let time = 0;
  const calls = { shelters: 0, water: 0 };
  const source: DataSource = {
    fetchShelters: jest.fn(async () => {
      calls.shelters += 1;
      return [];
    }),
    fetchWaterLevels: jest.fn(async () => {
      calls.water += 1;
      return [];
    }),
    fetchDamageReports: jest.fn(async () => []),
    fetchTrafficRegulations: jest.fn(async () => []),
  };
  const throttled = withMinInterval(source, intervalMs, () => time);
  return { throttled, calls, advance: (ms: number) => (time += ms) };
}

describe('withMinInterval', () => {
  it('間隔内の再取得は API を叩かず前回の結果を返す', async () => {
    const { throttled, calls, advance } = setup();
    await throttled.fetchShelters();
    advance(59_000);
    await throttled.fetchShelters();
    expect(calls.shelters).toBe(1);
  });

  it('間隔が過ぎたら再取得する', async () => {
    const { throttled, calls, advance } = setup();
    await throttled.fetchShelters();
    advance(60_000);
    await throttled.fetchShelters();
    expect(calls.shelters).toBe(2);
  });

  it('失敗は覚えず、次の呼び出しで再試行する', async () => {
    let time = 0;
    let fail = true;
    const fetchShelters = jest.fn(async () => {
      if (fail) throw new Error('network');
      return [];
    });
    const throttled = withMinInterval(
      {
        fetchShelters,
        fetchWaterLevels: async () => [],
        fetchDamageReports: async () => [],
        fetchTrafficRegulations: async () => [],
      },
      60_000,
      () => time,
    );
    await expect(throttled.fetchShelters()).rejects.toThrow('network');
    fail = false;
    // 時計を進めなくても、失敗直後の再試行は通す
    await expect(throttled.fetchShelters()).resolves.toEqual([]);
    expect(fetchShelters).toHaveBeenCalledTimes(2);
  });

  it('実行中の呼び出しは共有される(同時に呼んでも API は1回)', async () => {
    const { throttled, calls } = setup();
    await Promise.all([throttled.fetchShelters(), throttled.fetchShelters()]);
    expect(calls.shelters).toBe(1);
  });

  it('メソッドごとに独立して制限される', async () => {
    const { throttled, calls } = setup();
    await throttled.fetchShelters();
    await throttled.fetchWaterLevels();
    expect(calls.shelters).toBe(1);
    expect(calls.water).toBe(1);
  });
});
