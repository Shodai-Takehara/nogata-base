import type { LatLng } from '@/domain/models';

import data from './lore-monuments.json';

/**
 * 直方市の自然災害伝承碑。国土地理院が全国分をまとめて配る GeoJSON から
 * scripts/lore-monuments.py で市の分だけを取り出した生成物を読む。
 * 碑文の要約(story)は市が国土地理院に登録した原文のままで、誤字を含めて直さない
 * (史実の記述に手を入れない)。写真は国土地理院が第三者の権利の確認を求めているため扱わない
 */
export type LoreMonument = {
  /** 国土地理院の ID(市区町村コード-連番) */
  id: string;
  name: string;
  /** 西暦。全国分には「不明」の碑があるため数値にしない */
  builtYear: string;
  address: string;
  disaster: string;
  disasterType: string;
  story: string;
  coord: LatLng;
};

export const LORE_META: { version: string; source: string } = data.meta;

export const LORE_MONUMENTS: readonly LoreMonument[] = data.monuments;

export const LORE_SOURCE = `国土地理院 自然災害伝承碑データ(${LORE_META.version}版)を加工して作成`;
export const LORE_ATTRIBUTION = `出典: ${LORE_SOURCE}`;
