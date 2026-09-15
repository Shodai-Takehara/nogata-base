"""同梱した地震ハザードデータ(src/constants/quake-mesh.json)が元データと食い違っていないかを確かめる。

  /usr/bin/python3 scripts/verify-quake-hazard.py [--live N]

1. 全セルについて、同梱値が API 応答のキャッシュ(.cache/quake-hazard/)の値と一致し、
   API が返したメッシュコードが計算したコードと一致する
2. 区分ごとの融合面が市域を隙間も重なりもなく敷き詰めている(座標の丸めぶんの誤差は許す)
3. --live N: N セル(市役所付近、最小、最大、乱数)を API から取り直し、値と矩形が一致する。
   キャッシュが古くなっていないか(年版の更新)を見るためのもので、API を N×2 回呼ぶ

生成スクリプトが変わったとき、データを作り直したときに実行する。
数式と検証の記録は データソース仕様書 §6 にある。
"""

import argparse
import importlib.util
import json
import os
import random
import sys
import time
import urllib.request

from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, '..', 'src', 'constants', 'quake-mesh.json')

# 座標を小数5桁に丸めているので、面積の対称差はその程度まで出る(市域の 0.1% 未満)
AREA_TOLERANCE = 1e-3


def load_script(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), os.path.join(HERE, name))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# 生成スクリプトの API、キャッシュ、値の取り出し、メッシュの1辺をそのまま使う(定義を二重に持たない)
qh = load_script('quake-hazard.py')


def check_cache(data):
    cells = data['cells']
    bad_code = bad_value = 0
    for code, values in cells.items():
        raw = json.load(open(os.path.join(qh.CACHE_DIR, f'{code}.json'), encoding='utf-8'))
        if raw['hazard'].get('meshcode') != code or raw['ground'].get('meshcode') != code:
            bad_code += 1
        expected = qh.values_from(raw['hazard'], raw['ground'])
        if expected != values:
            bad_value += 1
            if bad_value <= 3:
                print(f'  値の食い違い {code}: キャッシュ {expected} 同梱 {values}')
    print(f'1. キャッシュとの照合 {len(cells)} 件: コード不一致 {bad_code}、値不一致 {bad_value}')
    return bad_code == 0 and bad_value == 0


def check_tiling(fp, data):
    city = fp.load_city()
    classes = [
        (c['bucket'], unary_union([Polygon(p['outer'], p['holes']) for p in c['polys']]))
        for c in data['classes']
    ]
    ok = all(geom.is_valid for _, geom in classes)
    whole = unary_union([geom for _, geom in classes])
    gap = city.symmetric_difference(whole).area / city.area
    overlap = 0.0
    for i in range(len(classes)):
        for j in range(i + 1, len(classes)):
            overlap += classes[i][1].intersection(classes[j][1]).area / city.area
    print(f'2. 融合面の敷き詰め: 市域との対称差 {gap:.6f}、区分どうしの重なり {overlap:.6f}(面積比)')
    return ok and gap < AREA_TOLERANCE and overlap < 1e-9


def check_live(data, count):
    cells = data['cells']
    codes = list(cells)
    picks = ['5030458834', min(codes, key=lambda c: cells[c]['p55']), max(codes, key=lambda c: cells[c]['p55'])]
    random.seed(count)
    picks += random.sample([c for c in codes if c not in picks], max(0, count - len(picks)))
    ok = True
    for code in picks[:count]:
        lat, lng = center_of(code)
        query = f'?position={lng:.6f},{lat:.6f}&epsg=4326'
        hazard = qh.fetch_json(qh.HAZARD_API + query)['features'][0]
        time.sleep(qh.REQUEST_INTERVAL_SEC)
        ground = qh.fetch_json(qh.GROUND_API + query)['features'][0]['properties']
        time.sleep(qh.REQUEST_INTERVAL_SEC)
        live = qh.values_from(hazard['properties'], ground)
        ring = hazard['geometry']['coordinates'][0]
        api_box = (min(p[1] for p in ring), min(p[0] for p in ring), max(p[1] for p in ring), max(p[0] for p in ring))
        mine = bounds_of(code)
        # API は座標を小数5桁で返す
        box_ok = all(abs(a - b) < 2e-5 for a, b in zip(api_box, mine))
        value_ok = hazard['properties'].get('meshcode') == code and live == cells[code]
        ok = ok and box_ok and value_ok
        print(f'  {code}: 値 {"一致" if value_ok else "不一致"} 矩形 {"一致" if box_ok else "不一致"} p55 {cells[code]["p55"]} {cells[code]["jname"]}')
    print(f'3. API との照合 {min(count, len(picks))} 件: {"一致" if ok else "不一致あり"}')
    return ok


def bounds_of(code):
    """250m メッシュコードから矩形(南西隅と北東隅)。src/utils/mesh-code.ts の meshBounds と同じ計算。"""
    p, u = int(code[0:2]), int(code[2:4])
    q, v, r, w = int(code[4]), int(code[5]), int(code[6]), int(code[7])
    half, quarter = int(code[8]), int(code[9])
    lat = p / 1.5 + q / 12 + r / 120 + (0.5 if half >= 3 else 0) / 120 + (0.5 if quarter >= 3 else 0) / 240
    lng = 100 + u + v / 8 + w / 80 + (0.5 if half % 2 == 0 else 0) / 80 + (0.5 if quarter % 2 == 0 else 0) / 160
    return (lat, lng, lat + qh.LAT_STEP, lng + qh.LNG_STEP)


def center_of(code):
    s, w, n, e = bounds_of(code)
    return ((s + n) / 2, (w + e) / 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', type=int, default=0, metavar='N')
    args = parser.parse_args()
    fp = load_script('flood-population.py')
    data = json.load(open(DATA_PATH, encoding='utf-8'))
    results = [check_cache(data), check_tiling(fp, data)]
    if args.live:
        results.append(check_live(data, args.live))
    if not all(results):
        sys.exit('食い違いがある')
    print('すべて一致')


if __name__ == '__main__':
    main()
