import type { DamageReport, Shelter, TrafficRegulation, WaterLevel } from '@/domain/models';

/**
 * 画面が依存するデータ取得の抽象。
 * ライブ(ArcGIS)とデモモード(フィクスチャ)をこのインターフェースで差し替える。
 */
export type DataSource = {
  fetchShelters(): Promise<Shelter[]>;
  fetchWaterLevels(): Promise<WaterLevel[]>;
  fetchDamageReports(): Promise<DamageReport[]>;
  fetchTrafficRegulations(): Promise<TrafficRegulation[]>;
};
