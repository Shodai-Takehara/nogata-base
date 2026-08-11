import { ArcgisError, queryGeoJson } from '@/data/arcgis/client';
import type { LayerConfig } from '@/data/arcgis/layers';

const testLayer: LayerConfig = {
  path: 'test/FeatureServer/0',
  allowedFields: ['OBJECTID', 'name'],
  fixedWhere: "flag = '公開'",
};

function geoJsonPage(count: number, exceeded: boolean) {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [130.7, 33.7] },
      properties: { OBJECTID: i },
    })),
    ...(exceeded ? { properties: { exceededTransferLimit: true } } : {}),
  };
}

describe('queryGeoJson', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ホワイトリスト外のフィールドはネットワークに出る前に拒否する', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(queryGeoJson(testLayer, { outFields: ['OBJECTID', 'field_10'] })).rejects.toThrow(
      ArcgisError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ワイルドカード指定を拒否する', async () => {
    await expect(queryGeoJson(testLayer, { outFields: ['*'] })).rejects.toThrow(ArcgisError);
  });

  it('outFields の省略(空)を拒否する', async () => {
    await expect(queryGeoJson(testLayer, { outFields: [] })).rejects.toThrow(ArcgisError);
  });

  it('固定 where(公開フラグ)が常にクエリへ含まれる', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(geoJsonPage(1, false)));

    await queryGeoJson(testLayer, { outFields: ['name'], where: 'name IS NOT NULL' });

    // URLSearchParams はスペースを + にエンコードするため、比較前に戻す
    const url = decodeURIComponent(String(fetchSpy.mock.calls[0][0])).replaceAll('+', ' ');
    expect(url).toContain("(flag = '公開') AND (name IS NOT NULL)");
  });

  it('exceededTransferLimit が続く間はページングして全件を集める', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(geoJsonPage(2, true)))
      .mockResolvedValueOnce(jsonResponse(geoJsonPage(1, false)));

    const features = await queryGeoJson(testLayer, { outFields: ['OBJECTID'] });

    expect(features).toHaveLength(3);
    expect(String(fetchSpy.mock.calls[1][0])).toContain('resultOffset=2');
  });

  it('HTTP 200 のボディ内エラーを例外にする', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ error: { code: 400, message: 'bad' } }));

    await expect(queryGeoJson(testLayer, { outFields: ['name'] })).rejects.toThrow(
      'ArcGIS error 400',
    );
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}
