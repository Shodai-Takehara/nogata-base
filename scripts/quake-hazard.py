"""地震ハザードレイヤー(F-15)のバンドルデータを生成するスクリプト。

  /usr/bin/python3 scripts/quake-hazard.py [--mesh 500] [--csv DIR]
  出力: src/constants/quake-mesh.json

J-SHIS(防災科学技術研究所)の2つの API から、直方市域に掛かる 250m メッシュの
確率論的地震動予測地図(2024年版)と表層地盤の値を取り出し、静的 JSON にする。
実行時に API を叩かないため(要件 NF-04)、ビルド前にここで市域ぶんを切り出す。

  地震ハザード情報提供 API: https://www.j-shis.bosai.go.jp/api-pshm-meshinfo
  表層地盤情報提供 API:     https://www.j-shis.bosai.go.jp/api-sstruct-meshinfo
  利用規約: 出典を明示すれば加工と再配布ができる(そのままの複製配布は不可)

行政区域と shapely の使い方は scripts/flood-population.py と同じで、同じキャッシュを使う。
API の応答は .cache/quake-hazard/ に保存し、再実行では API を呼ばない。
市域は J-SHIS が全面をカバーしているので、値が取れないメッシュがあれば失敗として止める。

  --mesh 500  4枚の 250m メッシュを 500m に集約してから融合する(描画が重いときの逃げ道)。
              確率は平均、地盤は面積の大きい区分にする。辞書のキーは9桁になる
  --csv DIR   API の呼び出し上限に当たり続けたときの経路。J-SHIS のダウンロードページから
              取得した1次メッシュ 5030 の CSV(確率論的地震動予測地図と表層地盤)を DIR に置く。
              列名は API と同じ(MESHCODE、T30_I55_PS、JCODE、JNAME …)と仮定している。未検証

融合した多角形の頂点を間引く選択肢は持たない。区分ごとに別々に間引くと、隣り合う区分の
共有辺がずれて隙間と重なりができる。頂点は 3,000 弱で間引く必要もない。
"""

import argparse
import csv
import glob
import importlib.util
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import date

from shapely.geometry import box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, '..', '.cache', 'quake-hazard')
OUT_PATH = os.path.join(HERE, '..', 'src', 'constants', 'quake-mesh.json')

VERSION = 'Y2024'
API_BASE = 'https://www.j-shis.bosai.go.jp/map/api'
HAZARD_API = f'{API_BASE}/pshm/{VERSION}/AVR/TTL_MTTL/meshinfo.geojson'
GROUND_API = f'{API_BASE}/sstrct/V4/meshinfo.geojson'

# 呼び出し上限は未公表(403 が定義されている)。1件ずつ間隔を空け、403 は待って再試行する
REQUEST_INTERVAL_SEC = 0.2
FORBIDDEN_WAIT_SEC = 60
MAX_RETRIES = 5

# 250m メッシュの1辺(JIS X 0410: 3次メッシュ 1/120°×1/80° を 4×4 に分けたもの)
LAT_STEP = 1 / 480
LNG_STEP = 1 / 320

# 地震本部の「今後30年間に震度6弱以上」の5段階。src/constants/quake-map.ts の QUAKE_BUCKETS と同じ境界
BUCKET_EDGES = [0.001, 0.03, 0.06, 0.26]

# 塗りは区分ごとに融合するので、座標は約1m の精度(5桁)で足りる
COORD_DIGITS = 5


def load_population_script():
    """行政区域の取得と読み込みは人口レイヤーのスクリプトと同じ手順を使う(同じキャッシュを共有する)。"""
    spec = importlib.util.spec_from_file_location(
        'flood_population', os.path.join(HERE, 'flood-population.py')
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def mesh_code_250(lat, lng):
    """座標を含む 250m メッシュのコード(10桁)。src/utils/mesh-code.ts と同じ計算。"""
    p = math.floor(lat * 1.5)
    u = math.floor(lng - 100)
    a = lat * 1.5 - p
    b = lng - 100 - u
    q = math.floor(a * 8)
    v = math.floor(b * 8)
    a = a * 8 - q
    b = b * 8 - v
    r = math.floor(a * 10)
    w = math.floor(b * 10)
    a = a * 10 - r
    b = b * 10 - w
    half = (1 if a < 0.5 else 3) + (0 if b < 0.5 else 1)
    a = (a * 2) % 1
    b = (b * 2) % 1
    quarter = (1 if a < 0.5 else 3) + (0 if b < 0.5 else 1)
    return f'{p:02d}{u:02d}{q}{v}{r}{w}{half}{quarter}'


def enumerate_cells(city):
    """市域の外接矩形を覆う 250m メッシュのうち、市域と面積を持って重なるものを返す。
    辺で接するだけのメッシュは市内ぶんの面積が 0 で、集約の重みにも塗りにも寄与しないので除く。"""
    minx, miny, maxx, maxy = city.bounds
    lat0 = math.floor(miny / LAT_STEP) * LAT_STEP
    lng0 = math.floor(minx / LNG_STEP) * LNG_STEP
    cells = {}
    lat = lat0
    while lat < maxy:
        lng = lng0
        while lng < maxx:
            rect = box(lng, lat, lng + LNG_STEP, lat + LAT_STEP)
            clipped = rect.intersection(city)
            if not clipped.is_empty and clipped.area > 0:
                code = mesh_code_250(lat + LAT_STEP / 2, lng + LNG_STEP / 2)
                cells[code] = {
                    'rect': rect,
                    'clipped': clipped,
                    'center': (lat + LAT_STEP / 2, lng + LNG_STEP / 2),
                }
            lng += LNG_STEP
        lat += LAT_STEP
    return cells


def fetch_json(url):
    """API を1回呼ぶ。403 は上限とみなして長く待ち、5xx と通信の失敗は間隔を広げて再試行する。"""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=30) as res:
                body = json.load(res)
            if body.get('status') != 'Success' or not body.get('features'):
                # 200 でも本文がエラーのことがある。値の無いメッシュとして残さず、失敗にする
                raise RuntimeError(f'API が値を返さない: {body.get("status")} {body.get("error")}')
            return body
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print(f'403: {FORBIDDEN_WAIT_SEC}秒待って再試行 ({attempt}/{MAX_RETRIES})')
                time.sleep(FORBIDDEN_WAIT_SEC)
            elif e.code >= 500:
                print(f'{e.code}: {2 * attempt}秒待って再試行 ({attempt}/{MAX_RETRIES})')
                time.sleep(2 * attempt)
            else:
                raise
        except (OSError, ValueError) as e:
            # OSError は URLError、socket.timeout(3.9 では TimeoutError と別)、接続切れを含む。
            # ValueError は途中で切れた JSON
            print(f'{type(e).__name__}: {2 * attempt}秒待って再試行 ({attempt}/{MAX_RETRIES})')
            time.sleep(2 * attempt)
    sys.exit(f'取得に失敗し続けた: {url}')


def fetch_cell(code, center):
    """1メッシュぶんの2 API の応答を返す。キャッシュがあれば API を呼ばない。"""
    path = os.path.join(CACHE_DIR, f'{code}.json')
    if os.path.exists(path):
        try:
            return json.load(open(path, encoding='utf-8'))
        except ValueError:
            # 途中で止めた実行が書きかけの JSON を残していたら、取り直す
            print(f'壊れたキャッシュを取り直す: {code}')
    lat, lng = center
    query = f'?position={lng:.6f},{lat:.6f}&epsg=4326'
    hazard = fetch_json(HAZARD_API + query)['features'][0]['properties']
    time.sleep(REQUEST_INTERVAL_SEC)
    ground = fetch_json(GROUND_API + query)['features'][0]['properties']
    time.sleep(REQUEST_INTERVAL_SEC)
    # API はその座標を含むメッシュを返すので、コードの計算が正しければ一致する。
    # 食い違ったまま 1,000 件を取って誤ったコードでキャッシュしないよう、最初の1件で止める
    if hazard.get('meshcode') != code:
        sys.exit(f'メッシュコードの計算が API と食い違う: 計算 {code}、API {hazard.get("meshcode")}')
    result = {'hazard': hazard, 'ground': ground}
    os.makedirs(CACHE_DIR, exist_ok=True)
    # 書きかけのファイルをキャッシュとして残さないよう、書き終えてから置く
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)
    os.replace(tmp, path)
    return result


def load_csv_rows(csv_dir):
    """--csv 経路。メッシュコードをキーに、両 CSV の列をまとめた辞書を返す。"""
    rows = defaultdict(dict)
    for path in glob.glob(os.path.join(csv_dir, '*.csv')):
        with open(path, encoding='utf-8-sig', newline='') as f:
            for row in csv.DictReader(f):
                code = row.get('MESHCODE') or row.get('meshcode')
                if code:
                    rows[code].update(row)
    if not rows:
        sys.exit(f'{csv_dir} に CSV が無い')
    if not any('JNAME' in row for row in rows.values()):
        sys.exit('JNAME 列が無い CSV には対応していない(微地形区分の名称を持てない)')
    return rows


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def values_from(hazard, ground):
    """API または CSV の属性から、アプリが使う値だけを取り出す。"""
    p55 = to_float(hazard.get('T30_I55_PS'))
    jname = ground.get('JNAME') or ''
    if p55 is None or not jname:
        return None
    jcode = to_float(ground.get('JCODE'))
    return {
        'p50': to_float(hazard.get('T30_I50_PS')),
        'p55': p55,
        'p60': to_float(hazard.get('T30_I60_PS')),
        'si': to_float(hazard.get('T30_P03_SI')),
        'arv': to_float(ground.get('ARV')),
        # CSV では '12.0' のように小数で来ることがあるので float を経由する
        'jcode': int(jcode) if jcode is not None else None,
        'jname': jname,
    }


def bucket_of(p55):
    index = 0
    for edge in BUCKET_EDGES:
        if p55 >= edge:
            index += 1
    return index


def aggregate_500m(cells):
    """4枚の 250m メッシュを 500m に集約する(--mesh 500)。
    確率と震度、増幅率は市内ぶんの面積で重み付けした平均、地盤は面積の大きい区分にする。"""
    groups = defaultdict(list)
    for code, cell in cells.items():
        groups[code[:-1]].append(cell)
    out = {}
    for code, members in groups.items():
        weights = [m['clipped'].area for m in members]
        total = sum(weights)
        values = {}
        for key in ('p50', 'p55', 'p60', 'si', 'arv'):
            pairs = [(m['values'][key], w) for m, w in zip(members, weights) if m['values'][key] is not None]
            values[key] = sum(v * w for v, w in pairs) / total if pairs else None
        ground = Counter()
        for m, w in zip(members, weights):
            ground[(m['values']['jcode'], m['values']['jname'])] += w
        (values['jcode'], values['jname']), _ = ground.most_common(1)[0]
        out[code] = {
            'rect': unary_union([m['rect'] for m in members]),
            'clipped': unary_union([m['clipped'] for m in members]),
            'values': values,
        }
    return out


def ring_of(linear_ring):
    """丸めで同じ座標になった隣り合う頂点を1つにする。閉じる終点は持たない。"""
    ring = []
    for x, y in linear_ring.coords[:-1]:
        point = [round(x, COORD_DIGITS), round(y, COORD_DIGITS)]
        if not ring or ring[-1] != point:
            ring.append(point)
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring.pop()
    return ring


def polygons_of(geom):
    """融合面を外周と穴に分けて返す。区分の面は別の区分の面を囲むことがあり(低地の中の台地など)、
    穴を落とすと外側の区分の塗りが内側にも重なって濃く見える。"""
    parts = geom.geoms if hasattr(geom, 'geoms') else [geom]
    polys = []
    for part in parts:
        if part.geom_type != 'Polygon':
            continue
        outer = ring_of(part.exterior)
        if len(outer) < 3:
            continue
        holes = [ring for ring in (ring_of(i) for i in part.interiors) if len(ring) >= 3]
        polys.append({'outer': outer, 'holes': holes})
    return polys


def fetched_on(from_api):
    """API から値を取った日。キャッシュから再生成しても、取得した日が残るようにする。"""
    if from_api:
        mtimes = [os.path.getmtime(p) for p in glob.glob(os.path.join(CACHE_DIR, '*.json'))]
        if mtimes:
            return date.fromtimestamp(min(mtimes))
    return date.today()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mesh', type=int, choices=[250, 500], default=250)
    parser.add_argument('--csv')
    args = parser.parse_args()

    fp = load_population_script()
    fp.fetch(only={'boundary'})
    city = fp.load_city()
    cells = enumerate_cells(city)
    print(f'市域に掛かる 250m メッシュ: {len(cells)} 枚')

    csv_rows = load_csv_rows(args.csv) if args.csv else None
    missing = []
    for index, (code, cell) in enumerate(cells.items()):
        if csv_rows is not None:
            row = csv_rows.get(code)
            values = values_from(row, row) if row else None
        else:
            result = fetch_cell(code, cell['center'])
            values = values_from(result['hazard'], result['ground'])
            if index % 100 == 0:
                print(f'  取得 {index}/{len(cells)}')
        if values is None:
            missing.append(code)
            continue
        cell['values'] = values
    if missing:
        sys.exit(f'値の無いメッシュがある(市域は J-SHIS が全面をカバーしているはず): {missing[:10]}')

    if args.mesh == 500:
        cells = aggregate_500m(cells)
        print(f'500m に集約: {len(cells)} 枚')

    # 値は API の精度(確率は小数6桁)のまま持ち、区分もその値で決める。小数3桁に丸めてから
    # 区分すると、境界のすぐ下のセル(2.9956% など)が J-SHIS の地図より1段濃い区分に入る。
    # アプリは同じ値から同じ境界で区分を引くので、丸めなくても塗りと詳細は食い違わない
    by_bucket = defaultdict(list)
    for cell in cells.values():
        by_bucket[bucket_of(cell['values']['p55'])].append(cell['clipped'])
    classes = [
        {'bucket': bucket, 'polys': polygons_of(unary_union(by_bucket[bucket]))}
        for bucket in sorted(by_bucket)
    ]

    p55s = [c['values']['p55'] for c in cells.values()]
    out = {
        'meta': {
            'version': VERSION,
            'fetchedAt': fetched_on(csv_rows is None).isoformat(),
            'cells': len(cells),
            'mesh': args.mesh,
        },
        'cells': {code: cell['values'] for code, cell in sorted(cells.items())},
        'classes': classes,
    }
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    hist = Counter(bucket_of(p) for p in p55s)
    vertices = sum(len(p['outer']) + sum(len(h) for h in p['holes']) for c in classes for p in c['polys'])
    print(
        f'書き出し: {os.path.normpath(OUT_PATH)} ({os.path.getsize(OUT_PATH) // 1024}KB) '
        f'区分別 {dict(sorted(hist.items()))} 頂点数 {vertices}'
    )
    print(f'30年 震度6弱以上: 最小 {min(p55s) * 100:.1f}% 最大 {max(p55s) * 100:.1f}%')
    names = Counter(c['values']['jname'] for c in cells.values())
    print(f'微地形区分: {dict(names.most_common())}')


if __name__ == '__main__':
    main()
