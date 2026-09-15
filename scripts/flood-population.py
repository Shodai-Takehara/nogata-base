"""浸水想定区域内の推計人口と、人口レイヤーのバンドルデータを生成するスクリプト。

  python3 scripts/flood-population.py
  出力: .cache/flood-population/out/flood-population.json(集計値。数値は Obsidian「直方ベース 調査 浸水想定区域内の人口推計」に転記し、JSON も同じ Vault に置く)
        src/constants/population-mesh.json(人口レイヤーが表示するメッシュ)

GDAL 系を避け、GeoJSON + shapely(+ 小地域境界のシェープファイル読みに pyshp)で完結させている。

  pip3 install shapely pyshp  # macOS 標準の python3 で動く

国土数値情報の3データセット(いずれも CC BY 4.0)と、e-Stat の国勢調査 小地域境界
(政府標準利用規約 2.0)を使う。初回実行時に自動で取得する。
"""

import glob
import json
import os
import re
import sys
import urllib.request
import zipfile
from collections import defaultdict

from shapely.geometry import box, shape
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely.validation import make_valid

BASE = 'https://nlftp.mlit.go.jp/ksj/gml/data'
DATASETS = [
    # 500mメッシュ別将来推計人口(R6国政局推計)福岡県。基準年2020の総人口と2070年までの推計を持つ
    (f'{BASE}/m500r6/m500r6-24/500m_mesh_2024_40_GEOJSON.zip', 'mesh'),
    # 洪水浸水想定区域(河川単位)2025年度版。県管理河川は都道府県別、国管理河川は地方整備局別に分かれる
    (f'{BASE}/A31a/A31a-25/A31a-25_40_10_GEOJSON.zip', 'flood_pref_main'),
    (f'{BASE}/A31a/A31a-25/A31a-25_40_20_GEOJSON.zip', 'flood_pref_other'),
    (f'{BASE}/A31a/A31a-25/A31a-25_89_10_GEOJSON.zip', 'flood_kyushu'),
    # 行政区域(2025-01-01)福岡県
    (f'{BASE}/N03/N03-2025/N03-20250101_40_GML.zip', 'boundary'),
    # 令和2年国勢調査 小地域(町丁・字等)境界 直方市。メッシュへ地域名を付けるのに使う
    (
        'https://www.e-stat.go.jp/gis/statmap-search/data'
        '?dlserveyId=A002005212020&code=40204&coordSys=1&format=shape&downloadType=5&datum=2011',
        'small_area',
    ),
]

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '.cache', 'flood-population')
# 集計値は repo に置かない(docs は UI カンプ以外を公開リポジトリに持たない方針)。取得キャッシュと同じ .cache 配下に出す
OUT_PATH = os.path.join(DATA_DIR, 'out', 'flood-population.json')
MESH_OUT_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'src', 'constants', 'population-mesh.json'
)

NOGATA = '40204'
YEARS = ['2020', '2025', '2050']
# 浸水深ランクコード(国土数値情報 water_depth_code)。かっこ内はコードリストの「内容」欄
RANK_LABEL = {
    1: '0〜0.5m未満(床下程度の浸水)',
    2: '0.5〜3.0m未満(床上から1階が浸水)',
    3: '3.0〜5.0m未満(2階部分が浸水)',
    4: '5.0〜10.0m未満(2階部分が水没)',
    5: '10.0〜20.0m未満',
    6: '20.0m以上',
}


def fetch(only=None):
    """データセットを取得して展開する。only に名前の集合を渡すとそれだけ取る
    (行政区域しか要らない別スクリプトが、浸水想定や人口まで落とさずに済むように)。"""
    os.makedirs(DATA_DIR, exist_ok=True)
    for url, name in DATASETS:
        if only is not None and name not in only:
            continue
        out = os.path.join(DATA_DIR, name)
        if os.path.isdir(out):
            continue
        zip_path = os.path.join(DATA_DIR, name + '.zip')
        if not os.path.exists(zip_path):
            print(f'取得中: {url}')
            urllib.request.urlretrieve(url, zip_path)
        with zipfile.ZipFile(zip_path) as zf:
            for info in zf.infolist():
                if info.filename.endswith('/'):
                    continue
                # 書庫内の日本語ディレクトリ名は文字化けしうるので ASCII 化して保存する
                safe = re.sub(r'[^0-9A-Za-z_./-]', '_', info.filename.replace('\\', '/'))
                path = os.path.join(out, safe)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'wb') as f:
                    f.write(zf.read(info))
        print(f'展開: {name}')


def find(pattern):
    return sorted(glob.glob(os.path.join(DATA_DIR, pattern), recursive=True))


def geometry_bbox(geom):
    xs, ys = [], []

    def walk(coords):
        if isinstance(coords[0], (int, float)):
            xs.append(coords[0])
            ys.append(coords[1])
        else:
            for child in coords:
                walk(child)

    walk(geom['coordinates'])
    return min(xs), min(ys), max(xs), max(ys)


def load_city():
    paths = find('boundary/**/*.geojson')
    if not paths:
        sys.exit('行政区域データが見つからない')
    features = json.load(open(paths[0], encoding='utf-8'))['features']
    polys = [
        make_valid(shape(f['geometry']))
        for f in features
        if f['properties'].get('N03_007') == NOGATA
    ]
    if not polys:
        sys.exit(f'行政区域コード {NOGATA} が見つからない')
    return unary_union(polys)


def load_meshes(city):
    """市域に掛かる全メッシュを、市域でクリップした面積比とともに返す。

    メッシュは1つの市区町村コードにしか属さないため、コードで絞ると境界メッシュの人口が
    隣接自治体へ丸ごと寄り、市の人口を数千人単位で取りこぼす。面積按分に切り替えている。
    """
    paths = find('mesh/**/*.geojson')
    if not paths:
        sys.exit('メッシュ人口データが見つからない')
    out = []
    for f in json.load(open(paths[0], encoding='utf-8'))['features']:
        geom = make_valid(shape(f['geometry']))
        if not geom.intersects(city):
            continue
        cell = geom.intersection(city)
        if cell.is_empty or cell.area <= 0:
            continue
        props = f['properties']
        out.append(
            {
                'cell': cell,
                # 分母はメッシュ全体。市域外にはみ出した部分には人口を配分しない
                'area': geom.area,
                'in_city': cell.area / geom.area,
                # PTN=総人口 / PTC=65歳以上 / PTD=75歳以上。2020年は総人口のみ収録
                'pop': {y: props.get(f'PTN_{y}') or 0.0 for y in YEARS},
                'p65': {y: props.get(f'PTC_{y}') or 0.0 for y in YEARS},
                'p75': {y: props.get(f'PTD_{y}') or 0.0 for y in YEARS},
            }
        )
    return out


def load_zones(city, pattern):
    """浸水想定のポリゴンを、市域でクリップして浸水深ランク別に集める。"""
    minx, miny, maxx, maxy = box(*city.bounds).bounds
    by_rank = defaultdict(list)
    rivers = set()
    for path in find(pattern):
        for f in json.load(open(path, encoding='utf-8'))['features']:
            geom = f.get('geometry')
            if geom is None:
                continue
            fx0, fy0, fx1, fy1 = geometry_bbox(geom)
            if fx1 < minx or fx0 > maxx or fy1 < miny or fy0 > maxy:
                continue
            clipped = make_valid(shape(geom)).intersection(city)
            if clipped.is_empty:
                continue
            props = f['properties']
            by_rank[int(props.get('A31a_205') or props.get('A31a_405') or 0)].append(clipped)
            rivers.add(props.get('A31a_202') or props.get('A31a_402'))
    return by_rank, sorted(r for r in rivers if r)


def apportion(meshes, geom):
    """メッシュ内は人口が一様に分布すると仮定し、重なり面積比で按分する。"""
    result = {y: {'pop': 0.0, 'p65': 0.0, 'p75': 0.0} for y in YEARS}
    prepared = prep(geom)
    for m in meshes:
        if not prepared.intersects(m['cell']):
            continue
        overlap = geom.intersection(m['cell'])
        if overlap.is_empty:
            continue
        ratio = overlap.area / m['area']
        for y in YEARS:
            for key in ('pop', 'p65', 'p75'):
                result[y][key] += m[key][y] * ratio
    return result


def load_small_areas():
    """小地域(町丁・字等)の名称とポリゴンを返す。座標系はメッシュと同じ JGD2011。"""
    import shapefile

    paths = find('small_area/*.shp')
    if not paths:
        sys.exit('小地域境界データが見つからない')
    reader = shapefile.Reader(os.path.splitext(paths[0])[0], encoding='cp932')
    return [
        (sr.record['S_NAME'], make_valid(shape(sr.shape.__geo_interface__)))
        for sr in reader.shapeRecords()
    ]


def dominant_area_name(cell, areas):
    """セルと最も広く重なる小地域の名称を返す。500m セルは複数の町丁字に
    またがるのが普通なので、面積が最大のものを「◯◯ 付近」として代表させる。
    小地域境界(2020年)と行政区域(2025年)の年代差で重ならない切れ端セルは、
    最も近い小地域で代表させる。"""
    best_name, best_area = '', 0.0
    for name, geom in areas:
        if not geom.intersects(cell):
            continue
        overlap = geom.intersection(cell).area
        if overlap > best_area:
            best_name, best_area = name, overlap
    if best_name:
        return best_name
    return min(areas, key=lambda entry: entry[1].distance(cell))[0]


def export_app_mesh(meshes, areas):
    """人口レイヤーがバンドルする JSON を書き出す。

    人数はメッシュ全体の値ではなく市内ぶんの按分値にする。市境のメッシュで
    市外の人口まで塗りの濃さに乗るのを避けるため。座標は約1mの精度(5桁)で
    丸め、市境の細かい輪郭は見た目が変わらない範囲で間引いてサイズを抑える。
    """
    cells = []
    for m in meshes:
        pop = round(m['pop']['2025'] * m['in_city'])
        p65 = round(m['p65']['2025'] * m['in_city'])
        geom = m['cell'].simplify(0.00005, preserve_topology=True)
        parts = geom.geoms if hasattr(geom, 'geoms') else [geom]
        polys = []
        for part in parts:
            # 市境と辺で接するメッシュは交差結果に線分が混ざりうるため、面だけを拾う。
            # 内側の穴は出力しない(直方市の行政区域に飛び地・穴がなく発生しないため)
            if part.geom_type != 'Polygon':
                continue
            ring = [[round(x, 5), round(y, 5)] for x, y in part.exterior.coords[:-1]]
            if len(ring) >= 3:
                polys.append(ring)
        if not polys:
            continue
        cells.append(
            {'name': dominant_area_name(m['cell'], areas), 'pop': pop, 'p65': p65, 'polys': polys}
        )
    with open(MESH_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(cells, f, ensure_ascii=False, separators=(',', ':'))
    unnamed = sum(1 for c in cells if not c['name'])
    if unnamed:
        print(f'警告: 地域名を決められないセルが {unnamed} 件ある')
    hist = defaultdict(int)
    for c in cells:
        hist[min(c['pop'] // 500, 3)] += 1
    print(
        f'人口レイヤー: {len(cells)} セル '
        f'(〜499人 {hist[0]} / 〜999人 {hist[1]} / 〜1499人 {hist[2]} / 1500人〜 {hist[3]}) '
        f'{os.path.getsize(MESH_OUT_PATH) // 1024}KB'
    )


def main():
    fetch()
    city = load_city()
    meshes = load_meshes(city)
    export_app_mesh(meshes, load_small_areas())
    by_rank, rivers = load_zones(city, 'flood_*/**/A31a-20-*.geojson')
    collapse, collapse_rivers = load_zones(city, 'flood_*/**/A31a-41-*.geojson')

    print(f'メッシュ {len(meshes)} 件 / 直方市に掛かる河川 {rivers}')

    # 河川ごとのポリゴンが重なるため、深いランクを優先して排他的な面に組み直す
    unions = {r: unary_union(by_rank[r]) for r in sorted(by_rank)}
    exclusive = {}
    deeper = None
    for r in sorted(unions, reverse=True):
        exclusive[r] = unions[r] if deeper is None else unions[r].difference(deeper)
        deeper = unions[r] if deeper is None else unary_union([deeper, unions[r]])

    totals = {y: {'pop': 0.0, 'p65': 0.0, 'p75': 0.0} for y in YEARS}
    for m in meshes:
        for y in YEARS:
            for key in ('pop', 'p65', 'p75'):
                totals[y][key] += m[key][y] * m['in_city']

    result = {
        'city_total': totals,
        'flood_total': apportion(meshes, deeper),
        # 0.5m と 3.0m は「床上に達するか」「2階へ逃げて足りるか」の分かれ目にあたる
        'over_0_5m': apportion(meshes, unary_union([unions[r] for r in unions if r >= 2])),
        'over_3_0m': apportion(meshes, unary_union([unions[r] for r in unions if r >= 3])),
        'by_rank': {
            str(r): {
                'label': RANK_LABEL[r],
                'population': apportion(meshes, g),
                'area_ratio': g.area / city.area,
            }
            for r, g in sorted(exclusive.items())
        },
        'flood_area_ratio': deeper.area / city.area,
        'rivers': rivers,
        'collapse_zone': {
            'population': apportion(meshes, unary_union([g for gs in collapse.values() for g in gs])),
            'rivers': collapse_rivers,
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    for y in YEARS:
        total, flood = totals[y]['pop'], result['flood_total'][y]['pop']
        print(
            f'{y}年 市全体 {total:,.0f}人 / 浸水想定区域内 {flood:,.0f}人 ({flood / total * 100:.1f}%)'
            f' / 65歳以上 {result["flood_total"][y]["p65"]:,.0f}人'
        )
    print(f'浸水想定区域は市域面積の {result["flood_area_ratio"] * 100:.1f}%')
    for r, v in result['by_rank'].items():
        print(
            f'  {v["label"]}: {v["population"]["2020"]["pop"]:,.0f}人 '
            f'/ 市域面積の {v["area_ratio"] * 100:.1f}%'
        )
    print(f'書き出し: {os.path.normpath(OUT_PATH)}')


if __name__ == '__main__':
    main()
