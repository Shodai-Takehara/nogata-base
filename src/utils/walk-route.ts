import type { LatLng } from '@/domain/models';

/**
 * 歩ける道のグラフ(scripts/walk-graph.py の生成物)。座標は平面(m)に直して持ち、
 * 点を道に落とす計算と最短経路を端末内で済ませる。
 * 隣接は CSR(節ごとの開始位置 + 隣の節と長さの並び)で持ち、配列の走査だけで済ませる
 */
export type Graph = {
  x: Float64Array;
  y: Float64Array;
  offsets: Int32Array;
  neighbors: Int32Array;
  lengths: Float64Array;
  edgeA: Int32Array;
  edgeB: Int32Array;
  edgeLength: Float64Array;
  /** 平面化の基準。緯度方向は 1 度 ≒ 111.32km、経度方向はその cos(緯度)倍 */
  originLat: number;
  originLng: number;
  cosLat: number;
  /** 点を道に落とすときに近くの辺だけ見るための升目。升目ごとに、掛かる辺の番号 */
  cells: Map<number, number[]>;
  cols: number;
};

export type GraphJson = {
  meta: { origin: LatLng; quant: number };
  nodes: number[];
  edges: number[];
};

const METERS_PER_DEGREE = 111_320;

/**
 * 点から道までがこれより遠いときは「道に落とせない」とみなす。
 * 市域の外や山の中に置かれた自宅ピンを、遠くの道まで直線で引いてから道のりを足すのは
 * 見かけ上の精度が上がるだけで意味がない
 */
const MAX_SNAP_METERS = 300;

/**
 * 升目の一辺(m)。辺を全部なめると 1 点あたり 10ms 超かかり、避難所 50 か所で目に見えて
 * 止まるため、点の周り(MAX_SNAP_METERS ぶん)の升目に掛かる辺だけを見る
 */
const CELL_METERS = 150;

let graph: Graph | null = null;

function loadGraph(): Graph {
  if (graph) return graph;
  // 起動時に 400KB を展開しないため、初めて道のりが要るときに読む
  graph = buildGraph(require('../constants/walk-graph.json'));
  return graph;
}

/** 生成物の形(scripts/walk-graph.py)から計算用の形へ。テストは小さなグラフをここに渡す */
export function buildGraph(json: GraphJson): Graph {
  const nodeCount = json.nodes.length / 2;
  const edgeCount = json.edges.length / 3;
  const originLat = json.meta.origin.latitude;
  const originLng = json.meta.origin.longitude;
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  const x = new Float64Array(nodeCount);
  const y = new Float64Array(nodeCount);
  // 生成物は前の値との差で並ぶ(scripts/walk-graph.py)
  let qLat = 0;
  let qLng = 0;
  for (let i = 0; i < nodeCount; i++) {
    qLat += json.nodes[i * 2];
    qLng += json.nodes[i * 2 + 1];
    y[i] = qLat * json.meta.quant * METERS_PER_DEGREE;
    x[i] = qLng * json.meta.quant * METERS_PER_DEGREE * cosLat;
  }
  const edgeA = new Int32Array(edgeCount);
  const edgeB = new Int32Array(edgeCount);
  const edgeLength = new Float64Array(edgeCount);
  const degree = new Int32Array(nodeCount);
  let prevA = 0;
  for (let e = 0; e < edgeCount; e++) {
    const a = prevA + json.edges[e * 3];
    const b = a + json.edges[e * 3 + 1];
    prevA = a;
    edgeA[e] = a;
    edgeB[e] = b;
    edgeLength[e] = json.edges[e * 3 + 2];
    degree[a]++;
    degree[b]++;
  }
  const offsets = new Int32Array(nodeCount + 1);
  for (let i = 0; i < nodeCount; i++) offsets[i + 1] = offsets[i] + degree[i];
  const fill = new Int32Array(nodeCount);
  const neighbors = new Int32Array(offsets[nodeCount]);
  const lengths = new Float64Array(offsets[nodeCount]);
  for (let e = 0; e < edgeCount; e++) {
    const a = edgeA[e];
    const b = edgeB[e];
    neighbors[offsets[a] + fill[a]] = b;
    lengths[offsets[a] + fill[a]] = edgeLength[e];
    fill[a]++;
    neighbors[offsets[b] + fill[b]] = a;
    lengths[offsets[b] + fill[b]] = edgeLength[e];
    fill[b]++;
  }
  const cols = 1 << 16;
  const cells = new Map<number, number[]>();
  for (let e = 0; e < edgeCount; e++) {
    const a = edgeA[e];
    const b = edgeB[e];
    const c0 = Math.floor(Math.min(x[a], x[b]) / CELL_METERS);
    const c1 = Math.floor(Math.max(x[a], x[b]) / CELL_METERS);
    const r0 = Math.floor(Math.min(y[a], y[b]) / CELL_METERS);
    const r1 = Math.floor(Math.max(y[a], y[b]) / CELL_METERS);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const key = r * cols + c;
        const list = cells.get(key);
        if (list) list.push(e);
        else cells.set(key, [e]);
      }
    }
  }
  return {
    x,
    y,
    offsets,
    neighbors,
    lengths,
    edgeA,
    edgeB,
    edgeLength,
    originLat,
    originLng,
    cosLat,
    cells,
    cols,
  };
}

/** 点を最も近い道の上に落とした結果。t は辺 a→b 上の位置(0〜1)、gap は点から道までの直線(m) */
type Snap = { edge: number; t: number; gap: number };

function toPlane(g: Graph, p: LatLng): { px: number; py: number } {
  return {
    px: (p.longitude - g.originLng) * METERS_PER_DEGREE * g.cosLat,
    py: (p.latitude - g.originLat) * METERS_PER_DEGREE,
  };
}

function snapToRoad(g: Graph, p: LatLng): Snap | null {
  const { px, py } = toPlane(g, p);
  let best: Snap | null = null;
  let bestGap = MAX_SNAP_METERS;
  const reach = Math.ceil(MAX_SNAP_METERS / CELL_METERS);
  const col = Math.floor(px / CELL_METERS);
  const row = Math.floor(py / CELL_METERS);
  const candidates: number[] = [];
  for (let r = row - reach; r <= row + reach; r++) {
    for (let c = col - reach; c <= col + reach; c++) {
      const list = g.cells.get(r * g.cols + c);
      if (list) candidates.push(...list);
    }
  }
  for (const e of candidates) {
    const a = g.edgeA[e];
    const b = g.edgeB[e];
    const ax = g.x[a];
    const ay = g.y[a];
    const dx = g.x[b] - ax;
    const dy = g.y[b] - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const gx = px - (ax + t * dx);
    const gy = py - (ay + t * dy);
    const gap = Math.sqrt(gx * gx + gy * gy);
    if (gap < bestGap) {
      bestGap = gap;
      best = { edge: e, t, gap };
    }
  }
  return best;
}

/** 配列の分割代入だと JIT の無い Hermes で毎回配列を作り、経路の計算が 2 倍遅くなる */
function swap(keys: number[], values: number[], i: number, j: number) {
  const k = keys[i];
  keys[i] = keys[j];
  keys[j] = k;
  const v = values[i];
  values[i] = values[j];
  values[j] = v;
}

/** 二分ヒープ。Dijkstra の「まだ確定していない節のうち最短のもの」を取り出す */
class MinHeap {
  private keys: number[] = [];
  private values: number[] = [];

  get size() {
    return this.keys.length;
  }

  push(key: number, value: number) {
    const keys = this.keys;
    const values = this.values;
    keys.push(key);
    values.push(value);
    let i = keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= keys[i]) break;
      swap(keys, values, parent, i);
      i = parent;
    }
  }

  pop(): { key: number; value: number } {
    const keys = this.keys;
    const values = this.values;
    const top = { key: keys[0], value: values[0] };
    const lastKey = keys.pop() as number;
    const lastValue = values.pop() as number;
    if (keys.length > 0) {
      keys[0] = lastKey;
      values[0] = lastValue;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < keys.length && keys[l] < keys[m]) m = l;
        if (r < keys.length && keys[r] < keys[m]) m = r;
        if (m === i) break;
        swap(keys, values, m, i);
        i = m;
      }
    }
    return top;
  }
}

function dijkstra(g: Graph, start: Snap): Float64Array {
  const dist = new Float64Array(g.x.length).fill(Infinity);
  const heap = new MinHeap();
  // 道の途中から歩き始めるので、辺の両端を「そこまでの長さ + 道までの直線」で種にする
  const a = g.edgeA[start.edge];
  const b = g.edgeB[start.edge];
  const len = g.edgeLength[start.edge];
  dist[a] = start.gap + start.t * len;
  dist[b] = start.gap + (1 - start.t) * len;
  heap.push(dist[a], a);
  heap.push(dist[b], b);
  while (heap.size > 0) {
    const { key, value: node } = heap.pop();
    if (key > dist[node]) continue;
    for (let i = g.offsets[node]; i < g.offsets[node + 1]; i++) {
      const next = g.neighbors[i];
      const candidate = key + g.lengths[i];
      if (candidate < dist[next]) {
        dist[next] = candidate;
        heap.push(candidate, next);
      }
    }
  }
  return dist;
}

/**
 * 自宅から各地点までの道のり(m)。道に落とせない、または道がつながっていない地点は null。
 * 自宅が道に落とせなければ全部 null(呼び出し側が直線距離に切り替える)。
 * 最短経路は自宅から1回だけ引き、地点ごとには道への落とし込みだけを行う
 */
export function walkDistancesFrom(origin: LatLng, targets: LatLng[]): (number | null)[] {
  return walkDistancesOn(loadGraph(), origin, targets);
}

export function walkDistancesOn(g: Graph, origin: LatLng, targets: LatLng[]): (number | null)[] {
  const start = snapToRoad(g, origin);
  if (!start) return targets.map(() => null);
  const dist = dijkstra(g, start);
  const from = toPlane(g, origin);
  return targets.map((target) => {
    const snap = snapToRoad(g, target);
    if (!snap) return null;
    // 自宅と同じ道の区間に落ちるなら同じ通りにいるので、両端を回らず直線で見る
    if (snap.edge === start.edge) {
      const to = toPlane(g, target);
      return Math.hypot(to.px - from.px, to.py - from.py);
    }
    const a = g.edgeA[snap.edge];
    const b = g.edgeB[snap.edge];
    const len = g.edgeLength[snap.edge];
    const best = Math.min(dist[a] + snap.t * len, dist[b] + (1 - snap.t) * len);
    if (!Number.isFinite(best)) return null;
    return best + snap.gap;
  });
}

/** テストと検証用: 点から最寄りの道までの直線(m)。道に落とせなければ null */
export function roadGapMeters(p: LatLng): number | null {
  return snapToRoad(loadGraph(), p)?.gap ?? null;
}
