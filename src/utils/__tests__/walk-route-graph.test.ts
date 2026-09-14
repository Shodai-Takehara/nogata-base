import { buildGraph, walkDistancesOn, type GraphJson } from '@/utils/walk-route';

/**
 * 手で組んだ小さなグラフで経路の計算だけを確かめる(同梱データの中身に依らない)。
 * 節は原点からの東(x)・北(y)の距離(m)で書き、生成物と同じ差分の整数に変換する
 */
const ORIGIN = { latitude: 33.7, longitude: 130.7 };
const QUANT = 1e-5;
const METERS_PER_DEGREE = 111_320;
const COS_LAT = Math.cos((ORIGIN.latitude * Math.PI) / 180);

const point = (x: number, y: number) => ({
  latitude: ORIGIN.latitude + y / METERS_PER_DEGREE,
  longitude: ORIGIN.longitude + x / (METERS_PER_DEGREE * COS_LAT),
});

function graphJson(nodes: [number, number][], edges: [number, number, number][]): GraphJson {
  const flatNodes: number[] = [];
  let prevLat = 0;
  let prevLng = 0;
  for (const [x, y] of nodes) {
    const p = point(x, y);
    const qLat = Math.round((p.latitude - ORIGIN.latitude) / QUANT);
    const qLng = Math.round((p.longitude - ORIGIN.longitude) / QUANT);
    flatNodes.push(qLat - prevLat, qLng - prevLng);
    prevLat = qLat;
    prevLng = qLng;
  }
  const flatEdges: number[] = [];
  let prevA = 0;
  for (const [a, b, len] of [...edges].sort((e, f) => e[0] - f[0])) {
    flatEdges.push(a - prevA, b - a, len);
    prevA = a;
  }
  return { meta: { origin: ORIGIN, quant: QUANT }, nodes: flatNodes, edges: flatEdges };
}

// A(0,0) - B(100,0) - C(100,100) - D(0,100) のコの字。A と D の間に道は無い(川のつもり)。
// E(500,0) - F(600,0) はどこにもつながらない飛び地
const graph = buildGraph(
  graphJson(
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [500, 0],
      [600, 0],
    ],
    [
      [0, 1, 100],
      [1, 2, 100],
      [2, 3, 100],
      [4, 5, 100],
    ],
  ),
);

const near = (value: number | null, expected: number) => {
  expect(value).not.toBeNull();
  expect(Math.abs((value as number) - expected)).toBeLessThan(3);
};

describe('walkDistancesOn', () => {
  it('直線で 100m の A→D は、道が無いので B、C を回って 300m', () => {
    const [d] = walkDistancesOn(graph, point(0, 0), [point(0, 100)]);
    near(d, 300);
  });

  it('辺の途中の地点は、両端からの距離の短い方で測る', () => {
    const [d] = walkDistancesOn(graph, point(0, 0), [point(100, 50)]);
    near(d, 150);
  });

  it('自宅が辺の途中にあれば、そこから両方向へ歩き始める', () => {
    const [d] = walkDistancesOn(graph, point(50, 0), [point(0, 100)]);
    near(d, 250);
  });

  it('自宅と同じ辺に落ちる地点は直線で見る', () => {
    const [d] = walkDistancesOn(graph, point(20, 0), [point(70, 0)]);
    near(d, 50);
  });

  it('道から離れた地点は、道までの直線を足す', () => {
    const [d] = walkDistancesOn(graph, point(0, 0), [point(100, 120)]);
    near(d, 220);
  });

  it('道がつながらない地点は null', () => {
    const [d] = walkDistancesOn(graph, point(0, 0), [point(550, 0)]);
    expect(d).toBeNull();
  });

  it('自宅が道から 300m 以上離れていれば全部 null', () => {
    expect(walkDistancesOn(graph, point(0, 1000), [point(0, 0), point(100, 0)])).toEqual([
      null,
      null,
    ]);
  });
});
