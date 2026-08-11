import {
  chooseFloorAnchor,
  clampDepth,
  clampFloorHeight,
  DEFAULT_DEPTH_M,
  DEFAULT_FLOOR_HEIGHT_M,
  DEPTH_MAX_M,
  DEPTH_MIN_M,
  effectiveWaterDepth,
  FLOOR_HEIGHT_MAX_M,
  formatDepth,
  type FloorAnchorChoice,
} from '@/features/ar/water-plane';

describe('clampDepth', () => {
  it('可動域内の値は 0.1m 刻みに丸める', () => {
    expect(clampDepth(2.04)).toBe(2.0);
    expect(clampDepth(2.05)).toBe(2.1);
    expect(clampDepth(3.0)).toBe(3.0);
  });

  it('可動域の外は端に丸める', () => {
    expect(clampDepth(0)).toBe(DEPTH_MIN_M);
    expect(clampDepth(-1)).toBe(DEPTH_MIN_M);
    expect(clampDepth(99)).toBe(DEPTH_MAX_M);
  });

  it('数値でない入力は既定値に落とす', () => {
    expect(clampDepth(NaN)).toBe(DEFAULT_DEPTH_M);
    expect(clampDepth(Infinity)).toBe(DEFAULT_DEPTH_M);
  });
});

describe('formatDepth', () => {
  it('小数1桁+単位で整形する', () => {
    expect(formatDepth(2)).toBe('2.0m');
    expect(formatDepth(0.5)).toBe('0.5m');
  });
});

describe('clampFloorHeight', () => {
  it('1m までは 0.1m 刻みに丸める', () => {
    expect(clampFloorHeight(0.34)).toBe(0.3);
    expect(clampFloorHeight(0.35)).toBe(0.4);
    expect(clampFloorHeight(0.95)).toBe(1.0);
  });

  it('1m を超えると 0.5m 刻みに丸める', () => {
    expect(clampFloorHeight(2.7)).toBe(2.5);
    expect(clampFloorHeight(2.8)).toBe(3.0);
  });

  it('可動域の外は端に丸める', () => {
    expect(clampFloorHeight(-1)).toBe(0);
    expect(clampFloorHeight(99)).toBe(FLOOR_HEIGHT_MAX_M);
  });

  it('数値でない入力は既定値に落とす', () => {
    expect(clampFloorHeight(NaN)).toBe(DEFAULT_FLOOR_HEIGHT_M);
  });
});

describe('effectiveWaterDepth', () => {
  it('想定浸水深から今いる場所の高さを引く', () => {
    // 想定 3m の地区でも、地面に立っていれば足元は 3m
    expect(effectiveWaterDepth(3, 0)).toBeCloseTo(3);
    // 高さ 1m の床なら足元は 2m
    expect(effectiveWaterDepth(3, 1)).toBeCloseTo(2);
  });

  it('高さが想定浸水深以上なら足元まで水は来ない(0)', () => {
    // 2階(約3m)にいれば想定 3m でも浸水しない
    expect(effectiveWaterDepth(3, 3)).toBe(0);
    expect(effectiveWaterDepth(2, 6)).toBe(0);
  });
});

describe('chooseFloorAnchor', () => {
  const plane = (
    anchorId: string,
    y: number,
    classification?: string,
    alignment = 'Horizontal',
  ) => ({ anchorId, type: 'plane', alignment, classification, position: [0, y, 0] });

  const table: FloorAnchorChoice = { anchorId: 'table', isFloor: false, y: -0.6 };
  const floor: FloorAnchorChoice = { anchorId: 'floor', isFloor: true, y: -1.3 };

  it('最初の水平面を仮の床として採用する', () => {
    expect(chooseFloorAnchor(null, plane('a', -0.6))).toEqual({
      anchorId: 'a',
      isFloor: false,
      y: -0.6,
    });
  });

  it('Floor 分類の平面はテーブル等より常に優先する', () => {
    expect(chooseFloorAnchor(table, plane('floor', -1.3, 'Floor'))).toEqual(floor);
    // 逆に、床を選んだ後に(より低い)非床が来ても置き換えない
    expect(chooseFloorAnchor(floor, plane('lower-table', -2.0, 'Table'))).toEqual(floor);
  });

  it('分類が同格なら低い方を床とみなす(机→床)', () => {
    expect(chooseFloorAnchor(table, plane('b', -1.4))?.anchorId).toBe('b');
    expect(chooseFloorAnchor(table, plane('c', -0.3))?.anchorId).toBe('table');
  });

  it('僅差の別平面には乗り換えない(水面が跳ねるのを防ぐ)', () => {
    // 15cm 未満の差は同じ床の再検出とみなして保持する
    expect(chooseFloorAnchor(table, plane('n', -0.7))?.anchorId).toBe('table');
    // 明確に低い(段差レベルの差がある)なら乗り換える
    expect(chooseFloorAnchor(table, plane('m', -0.8))?.anchorId).toBe('m');
  });

  it('同じアンカーの更新は位置・分類を常に取り込む', () => {
    const updated = chooseFloorAnchor(table, plane('table', -0.65, 'Floor'));
    expect(updated).toEqual({ anchorId: 'table', isFloor: true, y: -0.65 });
  });

  it('垂直面・plane 以外・情報欠損は無視する', () => {
    expect(chooseFloorAnchor(null, plane('w', -1.0, undefined, 'Vertical'))).toBeNull();
    expect(
      chooseFloorAnchor(null, { anchorId: 'i', type: 'image', position: [0, -1, 0] }),
    ).toBeNull();
    expect(chooseFloorAnchor(null, { type: 'plane', position: [0, -1, 0] })).toBeNull();
    expect(chooseFloorAnchor(null, { anchorId: 'p', type: 'plane' })).toBeNull();
  });

  it('HorizontalUpward / HorizontalDownward も水平面として受け入れる', () => {
    expect(chooseFloorAnchor(null, plane('u', -1.2, undefined, 'HorizontalUpward'))).not.toBeNull();
    expect(
      chooseFloorAnchor(null, plane('d', -1.2, undefined, 'HorizontalDownward')),
    ).not.toBeNull();
  });

  it('カメラ最高到達点から十分下にない未分類平面は床候補にしない', () => {
    // 構えた高さ(y=0)に対し、-0.4 は机の高さ → 棄却。-1.2 は床の深さ → 採用
    expect(chooseFloorAnchor(null, plane('t', -0.4), 0)).toBeNull();
    expect(chooseFloorAnchor(null, plane('f', -1.2), 0)?.anchorId).toBe('f');
  });

  it('Floor 分類の平面は高さに関わらず信用する', () => {
    // 座って構えるとカメラと床の差が小さくなるため、分類があるならそちらを優先
    expect(chooseFloorAnchor(null, plane('f', -0.3, 'Floor'), 0)?.anchorId).toBe('f');
  });

  it('選択中のアンカー自身が高すぎると分かったら選び直しに戻す', () => {
    // カメラ情報がない時点で机を仮採用 → カメラが上がった後の更新で手放す
    const provisional = chooseFloorAnchor(null, plane('table', -0.4));
    expect(provisional?.anchorId).toBe('table');
    expect(chooseFloorAnchor(provisional, plane('table', -0.4), 0)).toBeNull();
  });

  it('カメラ情報がなければ従来どおり高さフィルタを掛けない', () => {
    expect(chooseFloorAnchor(null, plane('t', -0.4))?.anchorId).toBe('t');
    expect(chooseFloorAnchor(null, plane('t', -0.4), null)?.anchorId).toBe('t');
  });
});
