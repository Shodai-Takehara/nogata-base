import type { LatLng } from '@/domain/models';

/**
 * 車中泊避難所。ArcGIS のデータソースには存在しないため、
 * 市が指定する車中泊避難所の一覧(2026-07 時点)から起こした静的データ
 * (開設状況の配信はない)。
 *
 * 出典: 直方市公式サイト「避難場所一覧」の車中泊用ページ群
 * https://www.city.nogata.fukuoka.jp/kurashi/_1206/_1691/_1694.html
 * ただし旧筑豊高校・イオンモール直方・ダイナム・フタバ九州の4件は
 * 市サイトの同ページ群では未確認(協定施設等の追加分。2026-07-14 調査)。
 * 市のページに所在地の記載がないため、住所は各施設の公開情報で補い、
 * 座標は施設ページ・国土地理院の住所ジオコーディングによる概略値。
 */
export type CarShelter = {
  id: number;
  name: string;
  address: string;
  coord: LatLng;
  /** 番地単位の座標を特定できず、大字の代表点で近似している施設 */
  approxCoord?: boolean;
};

export const CAR_SHELTERS: readonly CarShelter[] = [
  {
    id: 1,
    name: '福智山ろく花公園駐車場',
    address: '直方市大字永満寺1498',
    coord: { latitude: 33.734647, longitude: 130.769499 },
  },
  {
    id: 2,
    name: '東校区ふれあいアンビシャス広場',
    address: '直方市大字頓野',
    coord: { latitude: 33.745493, longitude: 130.750262 },
  },
  {
    id: 3,
    name: '直方中央公園駐車場',
    address: '直方市大字頓野1502',
    coord: { latitude: 33.757725, longitude: 130.745651 },
  },
  {
    id: 4,
    name: '旧筑豊高校',
    address: '直方市大字植木100',
    coord: { latitude: 33.765915, longitude: 130.702057 },
  },
  {
    id: 5,
    name: '旧直方ろう学校(グランド)',
    address: '直方市大字感田346-1',
    coord: { latitude: 33.759235, longitude: 130.747665 },
  },
  {
    id: 6,
    name: '直鞍産業振興センターADOX福岡本館',
    address: '直方市大字植木1245-2',
    coord: { latitude: 33.77387, longitude: 130.700767 },
  },
  {
    id: 7,
    name: 'イオンモール直方',
    address: '直方市湯野原2丁目1-1',
    coord: { latitude: 33.76894, longitude: 130.749512 },
  },
  {
    id: 8,
    name: 'ダイナム福岡直方店',
    address: '直方市大字上新入1862-1',
    // 番地単位で座標を特定できる公開情報がなく、大字上新入の代表点で近似している
    coord: { latitude: 33.748775, longitude: 130.704178 },
    approxCoord: true,
  },
  {
    id: 9,
    name: '株式会社フタバ九州',
    address: '直方市大字中泉1181-6',
    coord: { latitude: 33.712944, longitude: 130.737532 },
  },
];
