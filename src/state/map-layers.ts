import { AREA_LAYERS, type AreaLayerKey } from '@/constants/hazard-map';

/**
 * ホーム画面(S-01)の地図に何を出すかの状態(F-01 拡張)。
 * ピンは個別の切替、面の塗りは1つだけ、区域は個別の切替。
 * 塗りを排他にするのは、複数の面を重ねると色の意味が読めなくなるため。
 * 選択はセッション内でだけ保つ(端末に保存すると、災害時に前回の塗りが残ったまま
 * 開いてしまい、平常時の主目的である避難所と水位の確認を妨げる)。
 *
 * 一覧に出す順番はここの配列で決め、型はそこから導く。レイヤーを足すときに
 * 配列へ加えれば、選択シートの行と描画の両方に漏れなく現れる
 */
export const PIN_KEYS = ['shelters', 'carShelters', 'water', 'damage', 'traffic'] as const;
export type PinLayerKey = (typeof PIN_KEYS)[number];

export const FILL_KEYS = ['none', 'flood', 'population'] as const;
export type FillKey = (typeof FILL_KEYS)[number];

/** 区域は hazard-map.ts の AREA_LAYERS が正で、その定義順に並べる */
export const AREA_KEYS = Object.keys(AREA_LAYERS) as readonly AreaLayerKey[];
export type AreaKey = AreaLayerKey;

export type MapLayerState = {
  pins: Record<PinLayerKey, boolean>;
  fill: FillKey;
  areas: Record<AreaKey, boolean>;
};

export type MapLayerAction =
  | { type: 'togglePin'; key: PinLayerKey }
  | { type: 'setFill'; fill: FillKey }
  | { type: 'toggleArea'; key: AreaKey }
  /** その他タブの「ハザードマップを重ねる」からの遷移 */
  | { type: 'applyDeepLink'; link: 'hazard' };

/**
 * 既定値。ピンは平常時の主目的(避難所と水位の確認)なのですべて表示し、
 * 塗りと区域は非公式アプリが想定浸水域を常時表示するより利用者に明示的に
 * 出させる方が誤解が少ないため非表示にする
 */
export const INITIAL_MAP_LAYERS: MapLayerState = {
  pins: { shelters: true, carShelters: true, water: true, damage: true, traffic: true },
  fill: 'none',
  areas: { landslide: false, houseCollapse: false },
};

export function mapLayersReducer(state: MapLayerState, action: MapLayerAction): MapLayerState {
  switch (action.type) {
    case 'togglePin':
      return { ...state, pins: { ...state.pins, [action.key]: !state.pins[action.key] } };
    case 'setFill':
      return state.fill === action.fill ? state : { ...state, fill: action.fill };
    case 'toggleArea':
      return { ...state, areas: { ...state.areas, [action.key]: !state.areas[action.key] } };
    case 'applyDeepLink':
      return mapLayersReducer(state, { type: 'setFill', fill: 'flood' });
  }
}

/**
 * レイヤーボタンのバッジに出す数。塗り(選んでいれば1)と有効な区域の数。
 * ピンは既定で表示なので数えない(数えると初期状態から数字が出て、
 * 何かを選んだように見える)
 */
export function overlayCount(state: MapLayerState): number {
  const fill = state.fill === 'none' ? 0 : 1;
  return fill + AREA_KEYS.filter((key) => state.areas[key]).length;
}
