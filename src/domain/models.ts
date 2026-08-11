export type LatLng = {
  latitude: number;
  longitude: number;
};

/** 開設状況コード。データソースのコード値ドメイン(docs/api-spec.md §2.1)に一致させる */
export type ShelterOpening = '0' | '1' | '2' | '3';

/** 避難者内訳の年齢区分。データソースの8フィールド(男女×4区分)に合わせる */
export type AgeBracket = '0-3' | '3-18' | '18-65' | '65+';

export type EvacueeCount = {
  bracket: AgeBracket;
  male: number | null;
  female: number | null;
};

export type Shelter = {
  id: number;
  name: string;
  address: string | null;
  tel: string | null;
  opening: ShelterOpening;
  /** 避難中の世帯数 */
  families: number | null;
  /** 避難中の人数 */
  refugees: number | null;
  /** 収容可能人数 */
  capacity: number | null;
  /** 床面積(㎡) */
  floorAreaM2: number | null;
  /** 対応災害種別。元データは「○」(対応可)/「―」(非対応) */
  hazards: {
    flood: boolean;
    landslide: boolean;
    earthquake: boolean;
    other: boolean;
  };
  /** 避難者の年齢区分別内訳。若い区分から順に4件で固定 */
  evacuees: EvacueeCount[];
  /** 開設状況の入力日時(エポックms)。未入力(エポック0)は null に正規化 */
  updatedAt: number | null;
  coord: LatLng;
};

export type WaterKind = 'sensor' | 'gate';

export type WaterLevel = {
  /** kind と OBJECTID の合成。センサーとゲートを1画面に混ぜるため一意にする */
  id: string;
  kind: WaterKind;
  name: string;
  levelCm: number | null;
  /** 警戒水位(cm) */
  alertLevelCm: number | null;
  measuredAt: number | null;
  coord: LatLng;
};

export type DamageReport = {
  id: number;
  /** 災害状況の種別。「その他」は自由記述で置き換え済み */
  category: string;
  workResult: string | null;
  /** 災害対策本部からのコメント */
  hqNote: string | null;
  reportedAt: number | null;
  coord: LatLng;
};

export type TrafficRegulation = {
  id: number;
  status: string;
  note: string | null;
  startAt: number | null;
  endAt: number | null;
  /** 規制区間のライン */
  path: LatLng[];
};
