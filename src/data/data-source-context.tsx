import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { demoQuakeSource } from '@/data/demo-quake';
import { demoRainSource } from '@/data/demo-rain';
import { liveDataSource } from '@/data/live';
import { withMinInterval } from '@/data/throttle';
import type { DataSource } from '@/data/types';
import { useSettings, type DemoScenario } from '@/state/settings';

// スロットルの記憶を再マウントをまたいで保つため、モジュールスコープで1度だけ包む。
// デモはローカルデータで市のインフラに触れないため包まない
const throttledLiveSource = withMinInterval(liveDataSource);

const DEMO_SOURCES: Record<DemoScenario, DataSource> = {
  rain: demoRainSource,
  quake: demoQuakeSource,
};

const DataSourceContext = createContext<DataSource>(throttledLiveSource);

/** デモモード設定に応じてライブ/フィクスチャ(シナリオ別)を差し替える */
export function DataSourceProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useSettings();
  const dataSource = useMemo(
    () => (settings.demoMode ? DEMO_SOURCES[settings.demoScenario] : throttledLiveSource),
    [settings.demoMode, settings.demoScenario],
  );
  // 保存済み設定の読み込み前に画面を出すと、デモモード保存中でも一瞬ライブ API を
  // 叩いてしまう。読み込みは一瞬なので、完了までは描画しない(ネイティブスプラッシュが覆う)
  if (!ready) {
    return null;
  }
  return <DataSourceContext.Provider value={dataSource}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSource {
  return useContext(DataSourceContext);
}
