import { SHELTER_MASTER, WATER_MASTER } from '@/data/demo-master';
import type { DataSource } from '@/data/types';
import type { EvacueeCount, Shelter, ShelterOpening } from '@/domain/models';

/**
 * デモモード(要件 F-09): 2023年7月豪雨を参考にした「大雨災害時の直方市」の模擬シナリオ。
 * 施設名・座標・警戒水位は実データの取り込み(demo-master.ts)で、開設状況・水位・
 * 被害・規制の「状態」だけをここで与える。通信を一切行わないため、会場が圏外でも
 * デモが成立する。
 *
 * 避難者数・被害内容・規制区間は架空。実在の被災事実を示すものではない。
 */

/** 計測時刻が常に「数分前」に見えるよう、呼び出し時点から相対で作る */
const minutesAgo = (min: number) => Date.now() - min * 60_000;

/** 年齢内訳の合計が refugees と一致するように作る(デモの信憑性のため) */
const evacuees = (
  counts: [number, number, number, number, number, number, number, number],
): EvacueeCount[] => [
  { bracket: '0-3', male: counts[0], female: counts[1] },
  { bracket: '3-18', male: counts[2], female: counts[3] },
  { bracket: '18-65', male: counts[4], female: counts[5] },
  { bracket: '65+', male: counts[6], female: counts[7] },
];

/**
 * 開設する避難所(マスタの OBJECTID で指定)。
 * 遠賀川・彦山川沿いの低地(下境・感田・中泉)を中心に開く 2023年7月の実際の
 * 開設パターンを参考にしつつ、混雑度3段階が一度に見えるよう構成している。
 */
const OPEN_SHELTERS: Record<
  number,
  {
    opening: Exclude<ShelterOpening, '0'>;
    families: number;
    refugees: number;
    breakdown: [number, number, number, number, number, number, number, number];
    updatedMinutesAgo: number;
  }
> = {
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

/**
 * 観測点ごとの「警戒水位に対する比率」。名指しした地点で危険・注意を作り、
 * 残りは平常域に散らす。知古・感田は 2023年7月に冠水が報じられた地区。
 */
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

/** 平常域の比率。ID から決めて毎回同じ画面になるようにする(乱数は使わない) */
const calmRatio = (id: string) => 0.2 + ((id.length + id.charCodeAt(id.length - 1)) % 5) * 0.07;

export const demoDataSource: DataSource = {
  async fetchShelters() {
    return SHELTER_MASTER.map((master): Shelter => {
      const state = OPEN_SHELTERS[master.id];
      if (!state) {
        return {
          ...master,
          opening: '0',
          families: 0,
          refugees: 0,
          evacuees: evacuees([0, 0, 0, 0, 0, 0, 0, 0]),
          updatedAt: minutesAgo(180),
        };
      }
      return {
        ...master,
        opening: state.opening,
        families: state.families,
        refugees: state.refugees,
        evacuees: evacuees(state.breakdown),
        updatedAt: minutesAgo(state.updatedMinutesAgo),
      };
    });
  },

  async fetchWaterLevels() {
    return WATER_MASTER.map((master, i) => {
      const ratio = WATER_RATIO_BY_NAME[master.name] ?? calmRatio(master.id);
      return {
        ...master,
        levelCm:
          master.alertLevelCm != null ? Math.max(0, Math.round(master.alertLevelCm * ratio)) : null,
        measuredAt: minutesAgo(2 + (i % 5)),
      };
    });
  },

  async fetchDamageReports() {
    // 種別は実データのドメイン値(docs/api-spec.md §2.5 field_2)から使う
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
    // status は実データのドメイン値(全角括弧)に合わせる(docs/api-spec.md §2.4)
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
