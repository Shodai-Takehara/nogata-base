import {
  AREA_LAYERS,
  HAZARD_LAYERS,
  type AreaLayerKey,
  type HazardLayer,
} from '@/constants/hazard-map';

/**
 * ホーム画面の地図に何を出すかの状態。
 * ピンは個別の切替、ハザードの塗りは1つだけ、区域と人口は個別の切替。
 * 塗りを排他にするのは、複数の面を重ねると色の意味が読めなくなるため。
 * 人口は塗りに含めず、浸水タイルや区域タイルと重ねられるようにする。浸水域に
 * 何人住むかを読むのが人口レイヤーの主な使い方で、塗りと二者択一にすると成り立たない。
 * ただし市域全体を半透明の面で覆う塗り(FACE_FILLS)とは同時に出さない。重ねると
 * 人口の青が半分の濃さになったうえに塗りの色と混ざり、どちらの段階も見本と合わせられない。
 * 選択はセッション内でだけ保つ(端末に保存すると、災害時に前回の塗りが残ったまま
 * 開いてしまい、平常時の主目的である避難所と水位の確認を妨げる)。
 *
 * ピン、塗り、区域は一覧に出す順番をここの配列で決め、型はそこから導く。レイヤーを足すときに
 * 配列へ加えれば、選択シートの行と描画の両方に漏れなく現れる。人口だけは1つの真偽値で、
 * 選択シートと描画に直接書いてある
 */
export const PIN_KEYS = ['shelters', 'carShelters', 'water', 'damage', 'traffic'] as const;
export type PinLayerKey = (typeof PIN_KEYS)[number];

export const FILL_KEYS = ['none', 'flood', 'quake', 'landform'] as const;
export type FillKey = (typeof FILL_KEYS)[number];

/** タイルで描く塗り。地震は同梱データの面で描くのでタイルの定義に無く null */
export function fillTileLayer(fill: FillKey): HazardLayer | null {
  return HAZARD_LAYERS.find((layer) => layer.key === fill) ?? null;
}

/**
 * 市域全体を半透明の面で覆う塗り。洪水は浸水域だけに色が付き、他は透明なので含まない
 * (治水地形分類図は図郭の内側が白い基図まで不透明に描かれる)
 */
const FACE_FILLS: readonly FillKey[] = ['quake', 'landform'];

/** 区域は hazard-map.ts の AREA_LAYERS が正で、その定義順に並べる */
export const AREA_KEYS = Object.keys(AREA_LAYERS) as readonly AreaLayerKey[];
export type AreaKey = AreaLayerKey;

export type MapLayerState = {
  pins: Record<PinLayerKey, boolean>;
  fill: FillKey;
  areas: Record<AreaKey, boolean>;
  population: boolean;
};

export type MapLayerAction =
  | { type: 'togglePin'; key: PinLayerKey }
  | { type: 'setFill'; fill: FillKey }
  | { type: 'toggleArea'; key: AreaKey }
  | { type: 'togglePopulation' }
  /** その他タブの「ハザードマップを重ねる」からの遷移 */
  | { type: 'applyDeepLink'; link: 'hazard' };

/**
 * 既定値。ピンは平常時の主目的(避難所と水位の確認)なのですべて表示し、
 * 塗りと区域は非公式アプリが想定浸水域を常時表示するより利用者に明示的に
 * 出させる方が誤解が少ないため非表示にする。人口も同じく非表示
 */
export const INITIAL_MAP_LAYERS: MapLayerState = {
  pins: { shelters: true, carShelters: true, water: true, damage: true, traffic: true },
  fill: 'none',
  areas: { landslide: false, houseCollapse: false },
  population: false,
};

export function mapLayersReducer(state: MapLayerState, action: MapLayerAction): MapLayerState {
  switch (action.type) {
    case 'togglePin':
      return { ...state, pins: { ...state.pins, [action.key]: !state.pins[action.key] } };
    case 'setFill':
      if (state.fill === action.fill) return state;
      return {
        ...state,
        fill: action.fill,
        population: FACE_FILLS.includes(action.fill) ? false : state.population,
      };
    case 'toggleArea':
      return { ...state, areas: { ...state.areas, [action.key]: !state.areas[action.key] } };
    case 'togglePopulation':
      if (state.population) return { ...state, population: false };
      return {
        ...state,
        population: true,
        fill: FACE_FILLS.includes(state.fill) ? 'none' : state.fill,
      };
    case 'applyDeepLink':
      return mapLayersReducer(state, { type: 'setFill', fill: 'flood' });
  }
}

/**
 * レイヤーボタンのバッジに出す数。塗り(選んでいれば1)、有効な区域、人口の数。
 * ピンは既定で表示なので数えない(数えると初期状態から数字が出て、
 * 何かを選んだように見える)
 */
export function overlayCount(state: MapLayerState): number {
  const fill = state.fill === 'none' ? 0 : 1;
  const population = state.population ? 1 : 0;
  return fill + AREA_KEYS.filter((key) => state.areas[key]).length + population;
}
