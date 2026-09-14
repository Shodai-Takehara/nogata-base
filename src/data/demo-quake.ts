import {
  minutesAgo,
  sheltersWith,
  waterLevelsWith,
  type OpenShelterState,
} from '@/data/demo-scenario';
import type { DataSource } from '@/data/types';

/**
 * デモモードの地震シナリオ: 令和8年熊本地震(2026年7月)の教訓(指定避難所でも開設できない
 * 所が出る)を直方市の施設の上で再現し、地震では水位が動かないことも大雨との対比で見せる。
 * 車中泊避難所は開設状況を持たない静的データなので、このシナリオでも変えない。
 * 避難者数・被害内容・規制区間は架空。実在の被災事実を示すものではない。
 * 規制と点検の場所は実在の橋の上に置くが、実際の被害と取り違えないよう橋の名前は出さない。
 * 被害報告と規制の id は大雨シナリオと重ねない(切替の前に選んでいた報告が、切替後に別の内容へ
 * すり替わって同じシートに出ないため)
 */

/**
 * 開設する避難所。地震に対応する施設だけを開き、対応しない施設は閉鎖のまま残す。
 * 対応する施設でも多くは開かない(開設できない避難所があった教訓)
 */
const OPEN_SHELTERS: Record<number, OpenShelterState> = {
  // 直方市体育館: 市街地の拠点に集中して非常に混雑
  4: {
    opening: '3',
    families: 412,
    refugees: 1180,
    breakdown: [28, 30, 110, 118, 262, 280, 166, 186],
    updatedMinutesAgo: 9,
  },
  // 鞍手高等学校: 体育館の受け皿。やや混雑
  5: {
    opening: '2',
    families: 168,
    refugees: 455,
    breakdown: [10, 11, 44, 47, 102, 108, 63, 70],
    updatedMinutesAgo: 16,
  },
  // 下境小学校: 南部。大雨(やや混雑)より少なくして、切替で混雑が下がる筋を通す
  3: {
    opening: '1',
    families: 27,
    refugees: 72,
    breakdown: [2, 2, 7, 8, 17, 18, 9, 9],
    updatedMinutesAgo: 22,
  },
  // 感田小学校: 北部
  36: {
    opening: '1',
    families: 47,
    refugees: 128,
    breakdown: [3, 3, 12, 13, 30, 31, 17, 19],
    updatedMinutesAgo: 34,
  },
};

export const demoQuakeSource: DataSource = {
  async fetchShelters() {
    return sheltersWith(OPEN_SHELTERS);
  },

  async fetchWaterLevels() {
    // 地震では水位は動かない。全地点を平常域にして、大雨シナリオとの違いをそのまま見せる
    return waterLevelsWith({});
  },

  async fetchDamageReports() {
    return [
      {
        id: 101,
        category: '住家被害',
        workResult: '現地確認済み',
        hqNote: '落ちた瓦に近づかないでください。ブルーシートは市役所で配布します。',
        reportedAt: minutesAgo(95),
        coord: { latitude: 33.742, longitude: 130.7273 },
      },
      {
        // 一部通行止めの規制と同じ場所に置く(報告が事実、規制がその対応)
        id: 102,
        category: '道路被害',
        workResult: '片側交互通行で対応中',
        hqNote: '路面に段差があります。片側交互通行のため、通り抜けに時間がかかります。',
        reportedAt: minutesAgo(140),
        coord: { latitude: 33.7452, longitude: 130.7297 },
      },
      {
        id: 103,
        category: '断水等',
        workResult: '復旧作業中',
        hqNote: '給水車を直方市体育館に配置しています。容器を持参してください。',
        reportedAt: minutesAgo(60),
        coord: { latitude: 33.7405, longitude: 130.7247 },
      },
      {
        id: 104,
        category: '橋りょう',
        workResult: '点検中',
        hqNote: '点検が終わるまで通行できません。迂回してください。',
        reportedAt: minutesAgo(170),
        coord: { latitude: 33.7496, longitude: 130.7306 },
      },
      {
        // 実データでは field_2='other' + 自由記述で届く形の再現
        id: 105,
        category: 'ブロック塀の倒壊',
        workResult: '立入禁止のテープを設置',
        hqNote: null,
        reportedAt: minutesAgo(110),
        coord: { latitude: 33.7513, longitude: 130.7294 },
      },
    ];
  },

  async fetchTrafficRegulations() {
    return [
      {
        id: 101,
        status: '通行止め（全面）',
        note: '橋梁点検のため',
        startAt: minutesAgo(170),
        endAt: null,
        path: [
          { latitude: 33.74964, longitude: 130.73108 },
          { latitude: 33.74986, longitude: 130.73349 },
          { latitude: 33.75007, longitude: 130.73585 },
        ],
      },
      {
        id: 102,
        status: '通行止め（一部）',
        note: '路面の段差のため片側交互通行',
        startAt: minutesAgo(120),
        endAt: null,
        path: [
          { latitude: 33.74561, longitude: 130.72979 },
          { latitude: 33.74418, longitude: 130.72952 },
          { latitude: 33.74276, longitude: 130.72924 },
        ],
      },
    ];
  },
};
