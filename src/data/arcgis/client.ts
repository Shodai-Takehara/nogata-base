import { ARCGIS_BASE, type LayerConfig } from '@/data/arcgis/layers';

export type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] };

export type GeoJsonFeature = {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
};

type GeoJsonResponse = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  properties?: { exceededTransferLimit?: boolean };
  error?: { code: number; message: string };
};

export class ArcgisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArcgisError';
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
/** 全レイヤー合計でも数百件のデータなので、これを超えるのは異常事態とみなす */
const MAX_PAGES = 5;

type QueryOptions = {
  outFields: readonly string[];
  where?: string;
  orderBy?: string;
};

/**
 * ArcGIS Feature Service へ GeoJSON でクエリする唯一の入口。
 * f=geojson を固定することで、レイヤーごとに異なる座標系を WGS84 に統一する。
 */
export async function queryGeoJson(
  layer: LayerConfig,
  options: QueryOptions,
): Promise<GeoJsonFeature[]> {
  assertAllowedFields(layer, options.outFields);

  const features: GeoJsonFeature[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await fetchPage(layer, options, offset);
    features.push(...(body.features ?? []));
    if (!body.properties?.exceededTransferLimit) {
      return features;
    }
    offset = features.length;
  }
  throw new ArcgisError(`ページ数が上限(${MAX_PAGES})を超えました: ${layer.path}`);
}

/**
 * ホワイトリストの強制。個人情報フィールドの取得をコードレベルで不可能にするため、
 * 検証を通らないクエリはネットワークに出る前に例外で落とす。
 */
function assertAllowedFields(layer: LayerConfig, outFields: readonly string[]) {
  if (outFields.length === 0) {
    throw new ArcgisError('outFields は明示指定が必須です');
  }
  for (const field of outFields) {
    if (field === '*' || !layer.allowedFields.includes(field)) {
      throw new ArcgisError(`許可されていないフィールドです: ${field} (${layer.path})`);
    }
  }
}

async function fetchPage(
  layer: LayerConfig,
  options: QueryOptions,
  offset: number,
): Promise<GeoJsonResponse> {
  const where = [layer.fixedWhere, options.where]
    .filter(Boolean)
    .map((clause) => `(${clause})`)
    .join(' AND ');

  const params = new URLSearchParams({
    where: where || '1=1',
    outFields: options.outFields.join(','),
    f: 'geojson',
    resultOffset: String(offset),
  });
  if (options.orderBy) {
    params.set('orderByFields', options.orderBy);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${ARCGIS_BASE}/${layer.path}/query?${params}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ArcgisError(`HTTP ${res.status}: ${layer.path}`);
    }
    const body = (await res.json()) as GeoJsonResponse;
    // ArcGIS はエラー時も HTTP 200 でボディにエラーを入れて返す(データソース仕様書 §1)
    if (body.error) {
      throw new ArcgisError(`ArcGIS error ${body.error.code}: ${body.error.message}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}
