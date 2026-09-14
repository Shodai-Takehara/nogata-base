/**
 * 避難所までの道のりに使う歩ける道のグラフ。OpenStreetMap の道路から
 * scripts/walk-graph.py で直方市域ぶんを取り出して同梱している(生成物は walk-graph.json)。
 * 本体は utils/walk-route.ts が自宅ピンの設定後に初めて読む(起動時に 400KB を展開しない)
 */
export const WALK_GRAPH_SOURCE =
  'OpenStreetMap の道路データ(© OpenStreetMap contributors、ODbL、openstreetmap.org/copyright)を加工して作成';

export const WALK_GRAPH_ATTRIBUTION = `避難所までの道のり: ${WALK_GRAPH_SOURCE}`;
