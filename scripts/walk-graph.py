"""避難所までの道のりを端末内で求めるための、歩ける道のグラフを生成するスクリプト。

  /usr/bin/python3 scripts/walk-graph.py [--overpass PATH]
  出力: src/constants/walk-graph.json

OpenStreetMap の道路(highway)を Overpass API から直方市の外接矩形ぶん取り出し、
歩ける道だけを残して交差点と曲がり角の点(節)とその間の区間(辺)にまとめる。
アプリはこのグラフの上で自宅から最短経路を引き、避難所ごとの道のりの距離を出す。
直線距離だと遠賀川や線路を挟んだ避難所が「近い」と出てしまうため。

  出典: © OpenStreetMap contributors(ODbL)。アプリの出典表示に必ず出す
  Overpass API: https://overpass-api.de/api/interpreter(応答は .cache/walk-graph/ に保存し、再実行では取りに行かない)

  --overpass PATH  取得済みの Overpass 応答(JSON)を使う

区間の長さは元の道の折れ点をすべて足した実長で持つ。曲がり角の間引き(5m 以内の膨らみは
1本の線にする)は端末で自宅や避難所を道に落とすための形だけを軽くするもので、道のりの
長さは間引きの前と変わらない。

生成物の形(JSON を小さくするため、値は前の値との差で持つ):
  nodes: [dlat, dlng, ...]   節の座標。origin からの 1e-5 度単位の整数を、前の節との差で並べる
  edges: [da, db, len, ...]  辺。a は前の辺の a との差、b は a との差、len は実長(m)。a の昇順
"""

import argparse
import datetime
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, '..', 'src', 'constants', 'walk-graph.json')
SHELTER_MASTER_PATH = os.path.join(HERE, '..', 'src', 'data', 'demo-master.ts')
CACHE_DIR = os.path.join(HERE, '..', '.cache', 'walk-graph')
OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

# 直方市の行政区域の外接矩形(国土数値情報 N03 2025)に、市境をまたいで戻る道のぶん約 500m の余裕
CITY_BOUNDS = {'min_lat': 33.700, 'max_lat': 33.796, 'min_lng': 130.680, 'max_lng': 130.806}
MARGIN_DEG = 0.005

# 徒歩で通れる道。自動車専用(motorway)と工事中などは除く。
# 国道 200 号のバイパス(trunk)は第3種の一般道路で歩行者の規制は無いので入れる。
# foot=no が付くのは高速道と有料の側道で種類の除外と重なるが、将来のタグ付けに備えて別に見る
WALKABLE = {
    'footway', 'path', 'pedestrian', 'steps', 'living_street', 'residential', 'unclassified',
    'tertiary', 'tertiary_link', 'secondary', 'secondary_link', 'primary', 'primary_link',
    'trunk', 'trunk_link', 'service', 'track', 'road', 'cycleway',
}

# 座標は 1e-5 度(約 1m)の整数にして JSON を小さくする
QUANT = 1e-5
# 曲がり角の間引きの許容(m)。道に落とすときの誤差がこの範囲に収まる(徒歩 4 秒ぶん)
SIMPLIFY_TOLERANCE_M = 5.0
# 避難所が道からこれより離れていたら止める(端末側は 300m まで落とすが、避難所は敷地が広くても道に接する)
MAX_SHELTER_GAP_M = 150


def fetch_overpass(path):
    if path:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    os.makedirs(CACHE_DIR, exist_ok=True)
    cached = os.path.join(CACHE_DIR, 'overpass.json')
    if os.path.exists(cached):
        with open(cached, encoding='utf-8') as f:
            return json.load(f)
    s, w = CITY_BOUNDS['min_lat'] - MARGIN_DEG, CITY_BOUNDS['min_lng'] - MARGIN_DEG
    n, e = CITY_BOUNDS['max_lat'] + MARGIN_DEG, CITY_BOUNDS['max_lng'] + MARGIN_DEG
    query = f'[out:json][timeout:180];way["highway"]({s},{w},{n},{e});(._;>;);out body;'
    req = urllib.request.Request(
        OVERPASS_URL,
        data=urllib.parse.urlencode({'data': query}).encode(),
        method='POST',
        # Overpass は既定の Python-urllib の UA を 406 で断る
        headers={'User-Agent': 'nogata-base walk-graph (personal, contact via GitHub)'},
    )
    with urllib.request.urlopen(req, timeout=300) as res:
        data = json.loads(res.read())
    # Overpass は時間切れやメモリ不足を 200 で返し、remark に理由を書いて要素を欠く。
    # 欠けた応答を保存すると次回以降も欠けたまま使い続けるので、保存の前に止める
    if data.get('remark') or not data.get('elements'):
        sys.exit(f"Overpass の応答が不完全: {data.get('remark') or '要素が空'}")
    with open(cached, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return data


def walkable(tags):
    if tags.get('highway') not in WALKABLE:
        return False
    if tags.get('foot') == 'no':
        return False
    if tags.get('access') in ('no', 'private') and tags.get('foot') not in ('yes', 'designated'):
        return False
    return True


def haversine(a, b):
    r = 6_371_000
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def build_graph(data):
    coords = {e['id']: (e['lat'], e['lon']) for e in data['elements'] if e['type'] == 'node'}
    adj = defaultdict(dict)
    for way in data['elements']:
        if way['type'] != 'way' or not walkable(way.get('tags', {})):
            continue
        nodes = [n for n in way['nodes'] if n in coords]
        for a, b in zip(nodes, nodes[1:]):
            if a == b:
                continue
            length = haversine(coords[a], coords[b])
            # 同じ2点を結ぶ道が重なっていたら短い方
            adj[a][b] = min(length, adj[a].get(b, math.inf))
            adj[b][a] = min(length, adj[b].get(a, math.inf))
    return coords, adj


def keep_largest_component(adj):
    """つながっている道の塊のうち最大のものだけ残す。
    外接矩形で切った端の道は矩形の外で本体とつながっていて、中では飛び地になる。
    飛び地に自宅を落とすとどの避難所にも道が引けず、全部が直線に落ちてしまう"""
    seen = set()
    components = []
    for start in list(adj):
        if start in seen:
            continue
        stack, comp = [start], []
        seen.add(start)
        while stack:
            x = stack.pop()
            comp.append(x)
            for y in adj[x]:
                if y not in seen:
                    seen.add(y)
                    stack.append(y)
        components.append(comp)
    components.sort(key=len, reverse=True)
    for comp in components[1:]:
        for x in comp:
            del adj[x]
    return len(components), len(components[0])


def point_segment_distance_m(p, a, b):
    """緯度経度を局所的に平面とみなした、点 p と線分 ab の距離(m)"""
    k = math.cos(math.radians(a[0]))
    ax, ay = a[1] * k, a[0]
    bx, by = b[1] * k, b[0]
    px, py = p[1] * k, p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        t = 0
    else:
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    qx, qy = ax + t * dx, ay + t * dy
    return math.hypot(px - qx, py - qy) * 111_320


def simplify_chain(points):
    """Douglas-Peucker。残す点の添字を返す(両端は必ず残す)"""
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        if j - i < 2:
            continue
        far, far_d = -1, SIMPLIFY_TOLERANCE_M
        for k in range(i + 1, j):
            d = point_segment_distance_m(points[k], points[i], points[j])
            if d > far_d:
                far, far_d = k, d
        if far >= 0:
            keep[far] = True
            stack.append((i, far))
            stack.append((far, j))
    return [i for i, k in enumerate(keep) if k]


def collapse_chains(coords, adj):
    """交差点・行き止まり(次数が 2 でない節)の間の道を1本ずつ取り出し、曲がり角を間引く。
    戻り値: 節の id の一覧と、(a, b, 実長 m) の辺"""
    junction = {n for n, nb in adj.items() if len(nb) != 2}
    edges = []
    visited = set()  # 通った (節, 隣) の向き

    def walk(start, first):
        chain = [start, first]
        visited.add((start, first))
        while chain[-1] not in junction:
            cur, prev = chain[-1], chain[-2]
            nxt = [n for n in adj[cur] if n != prev]
            if not nxt or (cur, nxt[0]) in visited:
                break
            visited.add((cur, nxt[0]))
            chain.append(nxt[0])
            if chain[-1] == start:
                break
        return chain

    for start in junction:
        for first in adj[start]:
            if (start, first) in visited:
                continue
            chain = walk(start, first)
            for a, b in zip(chain, chain[1:]):
                visited.add((b, a))
            emit_chain(coords, adj, chain, edges)
    # 交差点を1つも含まない輪(周回路だけの道)は上の走査で拾えないので、残りを別に回す
    for start in adj:
        if start in junction:
            continue
        for first in adj[start]:
            if (start, first) in visited:
                continue
            chain = walk(start, first)
            for a, b in zip(chain, chain[1:]):
                visited.add((b, a))
            emit_chain(coords, adj, chain, edges)
    return edges


def emit_chain(coords, adj, chain, edges):
    points = [coords[n] for n in chain]
    kept = simplify_chain(points)
    for i, j in zip(kept, kept[1:]):
        length = sum(adj[chain[k]][chain[k + 1]] for k in range(i, j))
        edges.append((chain[i], chain[j], length))


def verify_shelters(coords, edges):
    """避難所マスタの全施設が本体の道の近くにあることを確かめる。
    OSM の道が消えたり foot=no に変わったりして避難所が孤立したら、生成の時点で気付く"""
    with open(SHELTER_MASTER_PATH, encoding='utf-8') as f:
        master = f.read()
    # 水位観測点(WATER_MASTER)も同じ形で並ぶので、避難所の定義だけを切り出す
    master = master[master.index('SHELTER_MASTER'):master.index('WATER_MASTER')]
    shelters = re.findall(
        r"name: '([^']+)'.*?coord: \{ latitude: ([\d.]+), longitude: ([\d.]+) \}", master, re.S
    )
    if len(shelters) < 40:
        sys.exit(f'避難所マスタから施設を読めない({len(shelters)} 件)')
    far = []
    for name, lat, lng in shelters:
        p = (float(lat), float(lng))
        gap = min(point_segment_distance_m(p, coords[a], coords[b]) for a, b, _ in edges)
        if gap > MAX_SHELTER_GAP_M:
            far.append(f'{name} ({gap:.0f}m)')
    if far:
        sys.exit(f'道から {MAX_SHELTER_GAP_M}m 以上離れた避難所がある: {far}')
    print(f'避難所 {len(shelters)} 件が道から {MAX_SHELTER_GAP_M}m 以内にある')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--overpass')
    args = parser.parse_args()

    data = fetch_overpass(args.overpass)
    coords, adj = build_graph(data)
    before = len(adj)
    component_count, kept = keep_largest_component(adj)
    edges = collapse_chains(coords, adj)
    verify_shelters(coords, edges)

    # 節の番号は辺を出した順に振る。道なりに続く節が隣り合う番号になり、差が小さくなる
    index = {}
    for a, b, _ in edges:
        for n in (a, b):
            if n not in index:
                index[n] = len(index)
    used = sorted(index, key=index.get)
    lat0, lng0 = CITY_BOUNDS['min_lat'] - MARGIN_DEG, CITY_BOUNDS['min_lng'] - MARGIN_DEG
    nodes = []
    prev_lat = prev_lng = 0
    for n in used:
        lat, lng = coords[n]
        q_lat, q_lng = round((lat - lat0) / QUANT), round((lng - lng0) / QUANT)
        nodes.append(q_lat - prev_lat)
        nodes.append(q_lng - prev_lng)
        prev_lat, prev_lng = q_lat, q_lng
    flat_edges = []
    prev_a = 0
    lengths = {}
    for a, b, length in edges:
        key = (min(index[a], index[b]), max(index[a], index[b]))
        # 同じ2点の間に道が2本あれば短い方(build_graph と同じ扱い)
        lengths[key] = min(round(length), lengths.get(key, math.inf))
    for a, b in sorted(lengths):
        flat_edges.append(a - prev_a)
        flat_edges.append(b - a)
        flat_edges.append(lengths[(a, b)])
        prev_a = a

    out = {
        'meta': {
            'source': 'OpenStreetMap',
            'license': 'ODbL',
            'fetchedAt': datetime.date.today().isoformat(),
            'origin': {'latitude': lat0, 'longitude': lng0},
            'quant': QUANT,
        },
        'nodes': nodes,
        'edges': flat_edges,
    }
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    size = os.path.getsize(OUT_PATH)
    print(
        f'歩ける道の節 {before}(塊 {component_count}、本体 {kept})→ 間引き後 {len(used)}、'
        f'辺 {len(lengths)}、{size / 1024:.0f} KB -> {os.path.relpath(OUT_PATH)}'
    )


if __name__ == '__main__':
    main()
