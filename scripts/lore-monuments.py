"""自然災害伝承碑のバンドルデータを生成するスクリプト。

  /usr/bin/python3 scripts/lore-monuments.py [--zip PATH]
  出力: src/constants/lore-monuments.json

国土地理院が全国分をまとめて配る GeoJSON の zip から、所在地が直方市の碑だけを取り出す。
全国分は 2,400 件を超えるので同梱せず、市の分(2 件)に絞る。

  データの配布: https://www.gsi.go.jp/bousaichiri/denshouhi_datalist.html
  利用規約:     国土地理院コンテンツ利用規約(出典の明示と、加工した旨の記載)

zip は .cache/lore-monuments/ に保存し、再実行ではダウンロードしない。
版は zip の中のフォルダ名(20260827_GeoJSON)から取る。新しい版に差し替えるときは
ZIP_URL を変え、キャッシュを消してから実行する。

  --zip PATH  ダウンロード済みの zip を使う(配布 URL が変わったときの逃げ道)
"""

import argparse
import io
import json
import os
import re
import sys
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, '..', 'src', 'constants', 'lore-monuments.json')
CACHE_DIR = os.path.join(HERE, '..', '.cache', 'lore-monuments')

ZIP_URL = 'https://www.gsi.go.jp/common/000250767.zip'
CITY_PREFIX = '福岡県直方市'


def load_zip(path):
    if path:
        with open(path, 'rb') as f:
            return f.read()
    os.makedirs(CACHE_DIR, exist_ok=True)
    cached = os.path.join(CACHE_DIR, os.path.basename(ZIP_URL))
    if os.path.exists(cached):
        with open(cached, 'rb') as f:
            return f.read()
    with urllib.request.urlopen(ZIP_URL, timeout=60) as res:
        data = res.read()
    with open(cached, 'wb') as f:
        f.write(data)
    return data


def read_geojson(zip_bytes):
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = [n for n in zf.namelist() if n.endswith('.geojson')]
        if len(names) != 1:
            sys.exit(f'geojson が 1 つでない: {names}')
        m = re.search(r'(\d{4})(\d{2})(\d{2})_GeoJSON/', names[0])
        if not m:
            sys.exit(f'フォルダ名から版が取れない: {names[0]}')
        version = '-'.join(m.groups())
        return version, json.loads(zf.read(names[0]).decode('utf-8'))


def to_monument(feature):
    p = feature['properties']
    lng, lat = feature['geometry']['coordinates']
    # 二次利用に条件の付いた碑(写真の利用申請など)を、気付かずに同梱しないための足止め
    if p['制限事項'].strip():
        sys.exit(f"{p['ID']} に制限事項がある: {p['制限事項'].strip()}。内容を確かめてから扱いを決める")
    return {
        'id': p['ID'],
        'name': p['碑名'].strip(),
        # 全国分には「不明」「不明(1934？)」の碑があるので数値にしない
        'builtYear': p['建立年'].strip(),
        'address': p['所在地'].strip(),
        'disaster': p['災害名'].strip(),
        'disasterType': p['災害種別'].strip(),
        # 碑文の要約は市が登録した原文のまま持つ(手を入れると史実の記述が変わる)
        'story': p['伝承内容'].strip(),
        'coord': {'latitude': lat, 'longitude': lng},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip')
    args = parser.parse_args()

    version, geojson = read_geojson(load_zip(args.zip))
    features = [
        f for f in geojson['features'] if f['properties']['所在地'].startswith(CITY_PREFIX)
    ]
    if not features:
        sys.exit('直方市の碑が 1 件も無い。所在地の表記が変わっていないか確かめる')
    monuments = sorted((to_monument(f) for f in features), key=lambda m: m['id'])

    out = {'meta': {'version': version, 'source': ZIP_URL}, 'monuments': monuments}
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{len(monuments)} 件 ({version} 版) -> {os.path.relpath(OUT_PATH)}')
    for m in monuments:
        print(f"  {m['id']} {m['name']} ({m['builtYear']}) {m['disaster']}")


if __name__ == '__main__':
    main()
