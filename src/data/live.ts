import { queryGeoJson, type GeoJsonFeature } from '@/data/arcgis/client';
import { LAYERS } from '@/data/arcgis/layers';
import type { DataSource } from '@/data/types';
import type {
  DamageReport,
  LatLng,
  Shelter,
  ShelterOpening,
  TrafficRegulation,
  WaterKind,
  WaterLevel,
} from '@/domain/models';
import { toEpochMs } from '@/utils/datetime';

/** 直方市の ArcGIS 公開データを読むライブ実装 */
export const liveDataSource: DataSource = {
  async fetchShelters() {
    const features = await queryGeoJson(LAYERS.shelters, {
      outFields: LAYERS.shelters.allowedFields,
      orderBy: 's_name',
    });
    return features.filter(hasPoint).map(toShelter);
  },

  async fetchWaterLevels() {
    const [sensors, gates] = await Promise.all([
      queryGeoJson(LAYERS.waterSensors, {
        outFields: LAYERS.waterSensors.allowedFields,
      }),
      queryGeoJson(LAYERS.tippingGates, {
        outFields: LAYERS.tippingGates.allowedFields,
      }),
    ]);
    return [
      ...sensors.filter(hasPoint).map((f) => toWaterLevel(f, 'sensor')),
      ...gates.filter(hasPoint).map((f) => toWaterLevel(f, 'gate')),
    ];
  },

  async fetchDamageReports() {
    const features = await queryGeoJson(LAYERS.damageReports, {
      outFields: LAYERS.damageReports.allowedFields,
      orderBy: 'CreationDate DESC',
    });
    return features.filter(hasPoint).map(toDamageReport);
  },

  async fetchTrafficRegulations() {
    const features = await queryGeoJson(LAYERS.trafficRegulations, {
      outFields: LAYERS.trafficRegulations.allowedFields,
    });
    return features.map(toTrafficRegulation).filter((r) => r.path.length > 0);
  },
};

function hasPoint(f: GeoJsonFeature): boolean {
  return f.geometry?.type === 'Point';
}

function pointCoord(f: GeoJsonFeature): LatLng {
  const [longitude, latitude] = (f.geometry as { coordinates: [number, number] }).coordinates;
  return { latitude, longitude };
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function toShelter(f: GeoJsonFeature): Shelter {
  const p = f.properties;
  const opening: ShelterOpening = ['0', '1', '2', '3'].includes(String(p.s_opening))
    ? (String(p.s_opening) as ShelterOpening)
    : '0';
  return {
    id: num(p.OBJECTID) ?? 0,
    name: str(p.s_name) ?? '名称不明',
    address: str(p.address),
    tel: str(p.tel),
    opening,
    families: num(p.n_family),
    refugees: num(p.n_refugees),
    capacity: num(p.s_capacity),
    floorAreaM2: num(p.f_space),
    // 元データは「○」が対応可、「―」が非対応
    hazards: {
      flood: p.f_suigai === '○',
      landslide: p.f_dosya === '○',
      earthquake: p.f_jisin === '○',
      other: p.f_sonota === '○',
    },
    evacuees: [
      { bracket: '0-3', male: num(p.n_m_0_3), female: num(p.n_f_0_3) },
      { bracket: '3-18', male: num(p.n_m_3_18), female: num(p.n_f_3_18) },
      { bracket: '18-65', male: num(p.n_m_18_65), female: num(p.n_f_18_65) },
      { bracket: '65+', male: num(p.n_m_65), female: num(p.n_f_65) },
    ],
    updatedAt: toEpochMs(p.input_dt),
    coord: pointCoord(f),
  };
}

function toWaterLevel(f: GeoJsonFeature, kind: WaterKind): WaterLevel {
  const p = f.properties;
  return {
    id: `${kind}-${num(p.OBJECTID) ?? 0}`,
    kind,
    name: str(p.facilityNm) ?? '観測点',
    levelCm: num(p.waterLv),
    alertLevelCm: num(p.judgeLv),
    measuredAt: toEpochMs(p.updateDt),
    coord: pointCoord(f),
  };
}

function toDamageReport(f: GeoJsonFeature): DamageReport {
  const p = f.properties;
  // 種別が「その他(other)」のときだけ自由記述が入る
  const category =
    str(p.field_2) === 'other'
      ? (str(p.field_2_other) ?? 'その他')
      : (str(p.field_2) ?? '種別不明');
  return {
    id: num(p.objectid) ?? 0,
    category,
    workResult: str(p.field_3),
    hqNote: str(p.field_13),
    reportedAt: toEpochMs(p.CreationDate),
    coord: pointCoord(f),
  };
}

function toTrafficRegulation(f: GeoJsonFeature): TrafficRegulation {
  const p = f.properties;
  const path: LatLng[] = [];
  if (f.geometry?.type === 'LineString') {
    for (const [lng, lat] of f.geometry.coordinates) {
      path.push({ latitude: lat, longitude: lng });
    }
  } else if (f.geometry?.type === 'MultiLineString') {
    // 表示上は一本の Polyline で足りるため、複数パートは連結して扱う
    for (const part of f.geometry.coordinates) {
      for (const [lng, lat] of part) {
        path.push({ latitude: lat, longitude: lng });
      }
    }
  }
  return {
    id: num(p.OBJECTID) ?? 0,
    status: str(p.status) ?? '通行止め',
    note: str(p.note),
    startAt: toEpochMs(p.startDt),
    endAt: toEpochMs(p.completeDt),
    path,
  };
}
