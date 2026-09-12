import {
  JNAME_NOTE,
  JNAME_READING,
  QUAKE_BUCKETS,
  quakeBucket,
  type QuakeCell,
} from '@/constants/quake-map';

import type { CopyKey } from './plain-japanese-copy';

type Copy = Record<CopyKey, string>;

/** 地震ハザードの詳細シート(S-05)と要約の1行に出す値。表示側で計算を重複させないためにここで確定する */
export type QuakeDetail = {
  /** 主値(震度6弱以上)。区分名と色は凡例との対応を取るために添える */
  main: { label: string; value: string; bucket: string; color: string };
  /** 副値(震度5強以上、6強以上)。データに無い値の行は出さない */
  subs: { label: string; value: string }[];
  ground: string;
  /** 微地形区分の説明。説明を持たない区分なら null */
  groundNote: string | null;
  amplification: string | null;
};

/**
 * 確率(0〜1)を百分率の小数1桁にして出す。同梱値は API の精度(小数6桁)のままだが、
 * 模型の推定値なので細かい桁を見せても判断は変わらず、細かいほど確からしく見えてしまう。
 * 区分(quakeBucket)は丸める前の値で決めるので、2.9956% は「3.0%」と出ても区分は 0.1〜3% のまま
 */
export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

/** 微地形区分の名称は原文のまま出し、やさしい日本語モードでは読みを添える(F-13) */
export function groundLabel(jname: string, easy: boolean): string {
  const reading = JNAME_READING[jname];
  return easy && reading ? `${jname}(${reading})` : jname;
}

export function groundNote(jname: string, easy: boolean): string | null {
  const note = JNAME_NOTE[jname];
  if (!note) return null;
  return easy ? note.easy : note.standard;
}

export function quakeDetail(cell: QuakeCell, copy: Copy, easy: boolean): QuakeDetail {
  const bucket = QUAKE_BUCKETS[quakeBucket(cell.p55)];
  const subs: QuakeDetail['subs'] = [];
  if (cell.p50 != null) {
    subs.push({ label: copy.quakeP50Label, value: formatProbability(cell.p50) });
  }
  if (cell.p60 != null) {
    subs.push({ label: copy.quakeP60Label, value: formatProbability(cell.p60) });
  }
  return {
    main: {
      label: copy.quakeP55Label,
      value: formatProbability(cell.p55),
      bucket: bucket.label,
      color: bucket.fill,
    },
    subs,
    ground: groundLabel(cell.jname, easy),
    groundNote: groundNote(cell.jname, easy),
    amplification: cell.arv != null ? `${cell.arv.toFixed(2)}${copy.quakeUnitTimes}` : null,
  };
}
