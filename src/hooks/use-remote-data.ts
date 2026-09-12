import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { readCache, writeCache } from '@/data/cache-store';
import { useSettings } from '@/state/settings';

type RemoteState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** データを得た時刻。キャッシュ復元時は保存時の取得時刻(古さの表示に使う) */
  fetchedAt: number | null;
};

/**
 * データ取得の共通フック。
 * デモモード切替でデータソースが変わったときに自動で再取得されるよう、
 * 呼び出し側は loader を useCallback で dataSource に依存させること。
 *
 * `cacheKey` を渡すと成功結果を端末に保存し、次回起動時はまずそれを表示してから
 * 最新を取りに行く(圏外でも前回データを出す)。デモモード中は
 * 模擬データを本物の器に残さないよう、保存も復元もしない。
 */
export function useRemoteData<T>(loader: () => Promise<T>, cacheKey?: string) {
  const { settings } = useSettings();
  const persistKey = settings.demoMode ? undefined : cacheKey;
  const [state, setState] = useState<RemoteState<T>>({
    data: null,
    loading: true,
    error: null,
    fetchedAt: null,
  });
  // 古いリクエストの結果が新しい結果を上書きしないための世代カウンタ
  const generation = useRef(0);

  // デモ⇄ライブの切替時は前のモードのデータを持ち越さない。
  // 特にライブへ戻した直後に圏外だと、残ったデモデータが本物に見えてしまう
  const prevDemoMode = useRef(settings.demoMode);
  useEffect(() => {
    if (prevDemoMode.current === settings.demoMode) return;
    prevDemoMode.current = settings.demoMode;
    generation.current += 1;
    setState({ data: null, loading: true, error: null, fetchedAt: null });
  }, [settings.demoMode]);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loader();
      if (generation.current === current) {
        setState({ data, loading: false, error: null, fetchedAt: Date.now() });
        if (persistKey) writeCache(persistKey, data);
      }
    } catch (e) {
      if (generation.current === current) {
        setState((prev) => ({
          // 直前のデータは残す。エラー時もキャッシュ表示を続けるため
          data: prev.data,
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
          fetchedAt: prev.fetchedAt,
        }));
      }
    }
  }, [loader, persistKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 起動直後の1回だけ復元する。生きた取得が先に済んでいれば何もしない
  useEffect(() => {
    if (!persistKey) return;
    let cancelled = false;
    readCache<T>(persistKey).then((cached) => {
      if (cancelled || !cached) return;
      setState((prev) =>
        prev.data == null ? { ...prev, data: cached.data, fetchedAt: cached.fetchedAt } : prev,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [persistKey]);

  // フォアグラウンド復帰時の再取得。頻発はスロットル層が抑える
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { ...state, refresh };
}
