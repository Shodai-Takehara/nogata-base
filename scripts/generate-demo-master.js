/**
 * デモモード用マスタデータの生成スクリプト。
 *
 *   node scripts/generate-demo-master.js
 *
 * 直方市の ArcGIS 公開データから施設マスタ(避難所・水位観測点)を取得し、
 * src/data/demo-master.ts に書き出す。デモの模擬データを実在の施設名・座標・
 * 警戒水位の上に組み立てるため(要件 F-09「実データと同様のシナリオ」)。
 *
 * 開設状況・避難者数・水位の「状態」は含めない(シナリオ側 demo.ts が与える)。
 * 取得フィールドは NF-01 のホワイトリスト(src/data/arcgis/layers.ts)の
 * 範囲内に限る。個人情報フィールド(input_p 等)は指定しないこと。
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://services1.arcgis.com/Po7csFzrJvObgZNq/arcgis/rest/services';
const OUT = path.join(__dirname, '..', 'src', 'data', 'demo-master.ts');

async function fetchGeoJson(layerPath, outFields) {
  const url =
    `${BASE}/${layerPath}/query?where=1%3D1` +
    `&outFields=${encodeURIComponent(outFields.join(','))}&f=geojson&outSR=4326`;
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(`${layerPath}: ${JSON.stringify(body.error)}`);
  return body.features;
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const coord = (f) => {
  const [lng, lat] = f.geometry.coordinates;
  return `{ latitude: ${round6(lat)}, longitude: ${round6(lng)} }`;
};
const strOrNull = (v) => (typeof v === 'string' && v.trim() !== '' ? JSON.stringify(v) : 'null');
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : 'null');

async function main() {
  const shelters = await fetchGeoJson('refuges_opening_status/FeatureServer/0', [
    'OBJECTID',
    's_name',
    'address',
    'tel',
    's_capacity',
    'f_space',
    'f_suigai',
    'f_dosya',
    'f_jisin',
    'f_sonota',
  ]);
  const sensors = await fetchGeoJson('wl_sensor/FeatureServer/0', [
    'OBJECTID',
    'facilityNm',
    'judgeLv',
  ]);
  const gates = await fetchGeoJson('tipping_gate/FeatureServer/0', [
    'OBJECTID',
    'facilityNm',
    'judgeLv',
  ]);

  const shelterRows = shelters
    // 名前のない行を通すと name: null の不正な TS を生成してしまうため除外する
    .filter((f) => f.geometry?.type === 'Point' && typeof f.properties.s_name === 'string')
    .map((f) => {
      const p = f.properties;
      return `  {
    id: ${p.OBJECTID},
    name: ${JSON.stringify(p.s_name)},
    address: ${strOrNull(p.address)},
    tel: ${strOrNull(p.tel)},
    capacity: ${numOrNull(p.s_capacity)},
    floorAreaM2: ${numOrNull(p.f_space)},
    hazards: {
      flood: ${p.f_suigai === '○'},
      landslide: ${p.f_dosya === '○'},
      earthquake: ${p.f_jisin === '○'},
      other: ${p.f_sonota === '○'},
    },
    coord: ${coord(f)},
  },`;
    });

  const waterRows = [
    ...sensors.map((f) => ({ f, kind: 'sensor' })),
    ...gates.map((f) => ({ f, kind: 'gate' })),
  ]
    .filter(({ f }) => f.geometry?.type === 'Point' && typeof f.properties.facilityNm === 'string')
    .map(({ f, kind }) => {
      const p = f.properties;
      return `  {
    id: '${kind}-${p.OBJECTID}',
    kind: '${kind}',
    name: ${JSON.stringify(p.facilityNm)},
    alertLevelCm: ${numOrNull(p.judgeLv)},
    coord: ${coord(f)},
  },`;
    });

  const now = new Date().toISOString().slice(0, 10);
  const output = `import type { LatLng, Shelter, WaterKind } from '@/domain/models';

/**
 * 直方市の公開データから取り込んだ施設マスタ(取得日: ${now})。
 * scripts/generate-demo-master.js で再生成する。手で編集しない。
 * 開設状況・水位などの「状態」はシナリオ(demo.ts)が与える。
 */
export type ShelterMaster = Pick<
  Shelter,
  'id' | 'name' | 'address' | 'tel' | 'capacity' | 'floorAreaM2' | 'hazards' | 'coord'
>;

export type WaterMaster = {
  id: string;
  kind: WaterKind;
  name: string;
  alertLevelCm: number | null;
  coord: LatLng;
};

export const SHELTER_MASTER: readonly ShelterMaster[] = [
${shelterRows.join('\n')}
];

export const WATER_MASTER: readonly WaterMaster[] = [
${waterRows.join('\n')}
];
`;

  fs.writeFileSync(OUT, output);
  console.log(
    `demo-master.ts を生成しました(避難所 ${shelterRows.length} / 観測点 ${waterRows.length})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
