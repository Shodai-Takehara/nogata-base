import { SHELTER_MASTER, WATER_MASTER } from '@/data/demo-master';
import type { EvacueeCount, Shelter, ShelterOpening, WaterLevel } from '@/domain/models';

/**
 * デモシナリオ(大雨、地震)に共通の組み立て。
 * 施設名・座標・警戒水位は実データの取り込み(demo-master.ts)から取り、各シナリオは
 * 開設状況と水位の「状態」だけを与える。施設に紐づかない被害報告と交通規制は
 * 各シナリオがそのまま持つ。通信を一切行わないため、会場が圏外でもデモが成立する。
 */

/** 計測時刻が常に「数分前」に見えるよう、呼び出し時点から相対で作る */
export const minutesAgo = (min: number) => Date.now() - min * 60_000;

/** 年齢区分別の避難者数。若い区分から男女の順で8つ */
export type EvacueeBreakdown = [number, number, number, number, number, number, number, number];

/** 開設する避難所の状態。マスタの OBJECTID をキーにして与える */
export type OpenShelterState = {
  opening: Exclude<ShelterOpening, '0'>;
  families: number;
  refugees: number;
  /** 合計が refugees と一致するように作る(デモの信憑性のため) */
  breakdown: EvacueeBreakdown;
  updatedMinutesAgo: number;
};

const evacuees = (counts: EvacueeBreakdown): EvacueeCount[] => [
  { bracket: '0-3', male: counts[0], female: counts[1] },
  { bracket: '3-18', male: counts[2], female: counts[3] },
  { bracket: '18-65', male: counts[4], female: counts[5] },
  { bracket: '65+', male: counts[6], female: counts[7] },
];

/** マスタの全施設に開設状態を当てる。指定の無い施設は閉鎖として並べる(一覧と地図に全施設を出すため) */
export function sheltersWith(open: Record<number, OpenShelterState>): Shelter[] {
  return SHELTER_MASTER.map((master): Shelter => {
    const state = open[master.id];
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
}

/** 平常域の比率。ID から決めて毎回同じ画面になるようにする(乱数は使わない) */
const calmRatio = (id: string) => 0.2 + ((id.length + id.charCodeAt(id.length - 1)) % 5) * 0.07;

/**
 * 観測点ごとの「警戒水位に対する比率」から水位を作る。
 * 名指しした地点だけ危険・注意にし、残りは平常域に散らす
 */
export function waterLevelsWith(ratioByName: Record<string, number>): WaterLevel[] {
  return WATER_MASTER.map((master, i) => {
    const ratio = ratioByName[master.name] ?? calmRatio(master.id);
    return {
      ...master,
      levelCm:
        master.alertLevelCm != null ? Math.max(0, Math.round(master.alertLevelCm * ratio)) : null,
      measuredAt: minutesAgo(2 + (i % 5)),
    };
  });
}
