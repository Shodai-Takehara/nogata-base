import {
  minutesAgo,
  sheltersWith,
  waterLevelsWith,
  type OpenShelterState,
} from '@/data/demo-scenario';
import type { DataSource } from '@/data/types';

/**
 * デモモードの大雨シナリオ: 2023年7月豪雨を参考にした「大雨災害時の直方市」。
 * 避難者数・被害内容・規制区間は架空。実在の被災事実を示すものではない。
 */

/**
 * 開設する避難所。
 * 遠賀川・彦山川沿いの低地(下境・感田・中泉)を中心に開く 2023年7月の実際の
 * 開設パターンを参考にしつつ、混雑度3段階が一度に見えるよう構成している。
 */
const OPEN_SHELTERS: Record<number, OpenShelterState> = {
  // 直方市体育館: 大規模拠点。やや混雑
  4: {
    opening: '2',
    families: 96,
    refugees: 267,
    breakdown: [6, 7, 28, 31, 86, 92, 8, 9],
    updatedMinutesAgo: 12,
  },
  // 直方市男女共同参画センター: 市街地中心(中央公民館はマスタ上の属性が空のため避ける)
  21: {
    opening: '1',
    families: 14,
    refugees: 38,
    breakdown: [1, 1, 4, 5, 12, 11, 2, 2],
    updatedMinutesAgo: 25,
  },
  // 直方歳時館: 小規模施設が定員近くまで埋まる例
  17: {
    opening: '3',
    families: 21,
    refugees: 58,
    breakdown: [1, 2, 5, 6, 18, 17, 4, 5],
    updatedMinutesAgo: 8,
  },
  // 感田小学校: 感田交差点の冠水を受けた北部の受け皿
  36: {
    opening: '1',
    families: 22,
    refugees: 61,
    breakdown: [2, 2, 7, 8, 19, 17, 3, 3],
    updatedMinutesAgo: 31,
  },
  // 中泉小学校: 南部アンダーパス冠水地区
  11: {
    opening: '1',
    families: 9,
    refugees: 24,
    breakdown: [0, 1, 3, 2, 8, 7, 1, 2],
    updatedMinutesAgo: 47,
  },
  // 下境小学校: 遠賀川沿い低地。やや混雑
  3: {
    opening: '2',
    families: 41,
    refugees: 118,
    breakdown: [3, 4, 13, 14, 38, 36, 5, 5],
    updatedMinutesAgo: 18,
  },
  // 直方北小学校
  38: {
    opening: '1',
    families: 11,
    refugees: 30,
    breakdown: [1, 1, 3, 3, 10, 9, 1, 2],
    updatedMinutesAgo: 39,
  },
};

/** 危険・注意にする観測点。知古・感田は 2023年7月に冠水が報じられた地区 */
const WATER_RATIO_BY_NAME: Record<string, number> = {
  知古: 1.2,
  感田マンホール: 1.16,
  宮若川アンダーパス_2: 2.4,
  感田交差点: 1.18,
  感田前田橋: 0.81,
  阿高神社: 0.76,
  木屋瀬川: 0.76,
  知古駐車場前: 0.78,
};

export const demoRainSource: DataSource = {
  async fetchShelters() {
    return sheltersWith(OPEN_SHELTERS);
  },

  async fetchWaterLevels() {
    return waterLevelsWith(WATER_RATIO_BY_NAME);
  },

  async fetchDamageReports() {
    return [
      {
        id: 1,
        category: '道路被害',
        workResult: '通行止めにて対応中',
        hqNote: '冠水のため通行できません。迂回してください。',
        reportedAt: minutesAgo(85),
        coord: { latitude: 33.7672, longitude: 130.7355 },
      },
      {
        id: 2,
        category: '河川',
        workResult: null,
        hqNote: '河川敷が冠水しています。近づかないでください。',
        reportedAt: minutesAgo(45),
        coord: { latitude: 33.7398, longitude: 130.7318 },
      },
      {
        id: 3,
        category: '土砂災害',
        workResult: '現地確認中',
        hqNote: null,
        reportedAt: minutesAgo(130),
        coord: { latitude: 33.736, longitude: 130.7648 },
      },
      {
        id: 4,
        category: '住家被害',
        workResult: '床下浸水を確認',
        hqNote: '罹災証明の申請方法は後日お知らせします。',
        reportedAt: minutesAgo(200),
        coord: { latitude: 33.725, longitude: 130.733 },
      },
      {
        id: 5,
        category: '用水路',
        workResult: '土のう設置済み',
        hqNote: null,
        reportedAt: minutesAgo(160),
        coord: { latitude: 33.7301, longitude: 130.7269 },
      },
      {
        id: 6,
        category: '断水等',
        workResult: '復旧作業中',
        hqNote: '給水車を中泉小学校に配置しています。',
        reportedAt: minutesAgo(70),
        coord: { latitude: 33.7192, longitude: 130.7392 },
      },
      {
        // 実データでは field_2='other' + 自由記述で届く形の再現
        id: 7,
        category: '倒木',
        workResult: '撤去済み',
        hqNote: null,
        reportedAt: minutesAgo(320),
        coord: { latitude: 33.769, longitude: 130.708 },
      },
    ];
  },

  async fetchTrafficRegulations() {
    return [
      {
        id: 1,
        status: '通行止め（全面）',
        note: 'アンダーパス冠水のため',
        startAt: minutesAgo(180),
        endAt: null,
        path: [
          { latitude: 33.7649, longitude: 130.7124 },
          { latitude: 33.7643, longitude: 130.7133 },
          { latitude: 33.7636, longitude: 130.7144 },
        ],
      },
      {
        id: 2,
        status: '通行止め（全面）',
        note: '交差点冠水のため',
        startAt: minutesAgo(120),
        endAt: null,
        path: [
          { latitude: 33.7673, longitude: 130.7348 },
          { latitude: 33.7679, longitude: 130.7359 },
          { latitude: 33.7686, longitude: 130.7369 },
        ],
      },
      {
        // 解除見込みが表示される例(片側交互通行)
        id: 3,
        status: '通行止め（一部）',
        note: '路肩崩れのため片側交互通行',
        startAt: minutesAgo(300),
        endAt: minutesAgo(-180),
        path: [
          { latitude: 33.7256, longitude: 130.7317 },
          { latitude: 33.7269, longitude: 130.7331 },
          { latitude: 33.7281, longitude: 130.7343 },
        ],
      },
    ];
  },
};
