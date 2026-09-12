import type { DataSource } from '@/data/types';

/**
 * 同一データの再取得を最短間隔に制限するデコレータ。
 * 市の共有インフラへの配慮で、間隔内の呼び出しには前回の成功結果をそのまま返す。
 * 実行中の呼び出しは共有し(同時に画面が複数開いても API は1回)、
 * 失敗は覚えない(次の呼び出しですぐ再試行できるように)。
 *
 * `now` は試験時に時計を差し替えるための引き数。
 */
export function withMinInterval(
  source: DataSource,
  intervalMs = 60_000,
  now: () => number = Date.now,
): DataSource {
  const wrap = <T>(fetch: () => Promise<T>): (() => Promise<T>) => {
    let lastAt = Number.NEGATIVE_INFINITY;
    let lastResult: T | undefined;
    let inFlight: Promise<T> | null = null;
    return () => {
      if (inFlight) return inFlight;
      if (lastResult !== undefined && now() - lastAt < intervalMs) {
        return Promise.resolve(lastResult);
      }
      inFlight = fetch()
        .then((data) => {
          lastAt = now();
          lastResult = data;
          return data;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    };
  };
  return {
    fetchShelters: wrap(() => source.fetchShelters()),
    fetchWaterLevels: wrap(() => source.fetchWaterLevels()),
    fetchDamageReports: wrap(() => source.fetchDamageReports()),
    fetchTrafficRegulations: wrap(() => source.fetchTrafficRegulations()),
  };
}
