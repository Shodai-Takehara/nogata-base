/**
 * AR 浸水体験(要件 F-08)の純粋ロジック。
 * Viro に依存させないことで、実機なしでテストできる範囲を最大化する。
 */

/** スライダーの可動域(要件 F-08: 0.5m〜5.0m) */
export const DEPTH_MIN_M = 0.5;
export const DEPTH_MAX_M = 5.0;
export const DEPTH_STEP_M = 0.1;
/**
 * 初期値。目線(約1.4m)より下に水面が見え、かつ「浸水」と一目で分かる胸の高さにする。
 * 2m 以上だと開いた瞬間に頭まで水没して状況が読めない
 */
export const DEFAULT_DEPTH_M = 1.0;

/** スライダー由来の値を可動域とステップに正規化する */
export function clampDepth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DEPTH_M;
  const clamped = Math.min(Math.max(value, DEPTH_MIN_M), DEPTH_MAX_M);
  // 0.1m 刻みに丸める。浮動小数の誤差を避けるため10倍で整数化する
  return Math.round(clamped * 10) / 10;
}

export function formatDepth(depthM: number): string {
  return `${depthM.toFixed(1)}m`;
}

/**
 * 「今いる場所の高さ」(地面からの高さ)の可動域。
 * 想定浸水深はハザードマップでは地面(GL)基準だが、実際に立っている床は
 * 2階や高台なら地面より上にある。その高さを差し引いて足元の水位を出すための入力。
 */
export const FLOOR_HEIGHT_MIN_M = 0;
export const FLOOR_HEIGHT_MAX_M = 10;
export const DEFAULT_FLOOR_HEIGHT_M = 0;

export function clampFloorHeight(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FLOOR_HEIGHT_M;
  const clamped = Math.min(Math.max(value, FLOOR_HEIGHT_MIN_M), FLOOR_HEIGHT_MAX_M);
  // 玄関の上がり框や基礎の高さなど低い値を細かく合わせられるよう、
  // 1m までは 0.1m 刻み、それ以上は 0.5m 刻みにする
  return clamped <= 1 ? Math.round(clamped * 10) / 10 : Math.round(clamped * 2) / 2;
}

/**
 * 足元に実際に来る水位。想定浸水深(地面基準)から、今いる場所の高さを引く。
 * 高さが想定浸水深以上なら 0(足元まで水は来ない)。
 */
export function effectiveWaterDepth(depthM: number, floorHeightM: number): number {
  const effective = depthM - floorHeightM;
  if (effective <= 0) return 0;
  // 0.1m 刻みに丸める(浮動小数の誤差を避けるため10倍で整数化)
  return Math.round(effective * 10) / 10;
}

/** Viro のアンカーのうち、床の選定に使う情報だけを抜き出した型 */
export type FloorAnchorCandidate = {
  anchorId?: string;
  type?: string;
  alignment?: string;
  classification?: string;
  position?: number[];
};

export type FloorAnchorChoice = {
  anchorId: string;
  /** ARKit が「床」と分類した平面か。テーブル等より常に優先する */
  isFloor: boolean;
  y: number;
};

/**
 * 床候補として認める、カメラ最高到達点からの最小の深さ(m)。
 * 立っていても座っていても端末は床から 0.8m 以上で構えるのが普通で、
 * これより浅い位置の水平面は机やソファ座面である可能性が高い。
 * 暗い室内では本物の床が検出されず机だけが見つかることがあり(水面が
 * 机+浸水深の高さに浮く誤表示になる)、その誤認をこの下限で防ぐ。
 */
export const MIN_FLOOR_BELOW_CAMERA_M = 0.8;

/**
 * 別のアンカーへ乗り換える最小の高低差(m)。
 * カメラを動かすと同じ床が僅差の別平面として再検出されることがあり、
 * 「低い方を採る」だけだと乗り換えのたびに水面が跳ねて見える。
 * 本当に別の段(縁石・段差)と判断できる差があるときだけ乗り換える。
 */
export const SWITCH_MARGIN_M = 0.15;

/**
 * 検出済みの水平面から「床」として使うアンカーを選ぶ。
 * 机やカウンターの天面も水平面として検出されるため、
 * ARKit の分類が Floor のものを最優先し、なければ最も低い水平面を床とみなす。
 * `maxCameraY` はセッション中のカメラ最高到達点(ワールド座標)。渡された場合、
 * そこから十分下にない未分類平面は床候補にしない。
 */
export function chooseFloorAnchor(
  current: FloorAnchorChoice | null,
  anchor: FloorAnchorCandidate,
  maxCameraY?: number | null,
): FloorAnchorChoice | null {
  if (anchor.type !== 'plane' || anchor.anchorId == null) return current;
  // alignment は Horizontal のほか HorizontalUpward/Downward がある(Viro の型定義)
  if (anchor.alignment != null && !anchor.alignment.toLowerCase().startsWith('horizontal')) {
    return current;
  }
  const y = anchor.position?.[1];
  if (typeof y !== 'number' || !Number.isFinite(y)) return current;

  const candidate: FloorAnchorChoice = {
    anchorId: anchor.anchorId,
    isFloor: anchor.classification === 'Floor',
    y,
  };

  // Floor 分類は信用する(高さで弾かない)。未分類だけ高さの下限を課す
  const tooHigh =
    maxCameraY != null && !candidate.isFloor && candidate.y > maxCameraY - MIN_FLOOR_BELOW_CAMERA_M;
  if (tooHigh) {
    // 選択中のアンカー自身が高すぎると分かったら、掴んだままにせず選び直しに戻す
    return current?.anchorId === candidate.anchorId ? null : current;
  }

  if (current == null) return candidate;
  // 同じアンカーの更新(位置・分類の精緻化)は常に取り込む
  if (current.anchorId === candidate.anchorId) return candidate;
  if (candidate.isFloor !== current.isFloor) {
    return candidate.isFloor ? candidate : current;
  }
  return candidate.y < current.y - SWITCH_MARGIN_M ? candidate : current;
}
