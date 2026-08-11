/**
 * データソースの定義。エンドポイント・フィールドの詳細は docs/api-spec.md が正。
 *
 * allowedFields はこのアプリが取得してよいフィールドのホワイトリスト(要件 NF-01)。
 * 被害報告レイヤーには報告者の氏名・電話番号などの個人情報フィールドが存在するため、
 * ここに載っていないフィールドはクライアント(client.ts)がクエリ発行前に拒否する。
 */
export const ARCGIS_BASE = 'https://services1.arcgis.com/Po7csFzrJvObgZNq/arcgis/rest/services';

export type LayerConfig = {
  path: string;
  allowedFields: readonly string[];
  /**
   * 市がダッシュボードで適用しているのと同じ公開条件(要件 NF-02)。
   * リポジトリ側の条件と AND されるのではなく、常にこの条件が基底になる。
   */
  fixedWhere?: string;
};

export const LAYERS = {
  shelters: {
    path: 'refuges_opening_status/FeatureServer/0',
    allowedFields: [
      'OBJECTID',
      's_name',
      'address',
      'tel',
      's_opening',
      'n_family',
      'n_refugees',
      's_capacity',
      'f_space',
      'f_suigai',
      'f_dosya',
      'f_jisin',
      'f_sonota',
      // 男女×年齢層別の避難者数。集計値であり個人を特定しない
      'n_m_0_3',
      'n_f_0_3',
      'n_m_3_18',
      'n_f_3_18',
      'n_m_18_65',
      'n_f_18_65',
      'n_m_65',
      'n_f_65',
      'input_dt',
    ],
  },
  waterSensors: {
    path: 'wl_sensor/FeatureServer/0',
    allowedFields: ['OBJECTID', 'facilityNm', 'waterLv', 'judgeLv', 'updateDt'],
  },
  tippingGates: {
    path: 'tipping_gate/FeatureServer/0',
    allowedFields: ['OBJECTID', 'facilityNm', 'waterLv', 'judgeLv', 'updateDt'],
  },
  damageReports: {
    path: 'survey123_9df18097b82b47798f4762b531043442/FeatureServer/0',
    allowedFields: [
      'objectid',
      'field_1',
      'field_2',
      'field_2_other',
      'field_3',
      'field_13',
      'CreationDate',
    ],
    fixedWhere: "field_7 = '公開'",
  },
  trafficRegulations: {
    path: 'traffic_reguration/FeatureServer/0',
    allowedFields: ['OBJECTID', 'status', 'note', 'startDt', 'completeDt'],
    fixedWhere: "openFlg = '公開'",
  },
} as const satisfies Record<string, LayerConfig>;

/**
 * 取得を明示的に禁止するフィールド。
 * ホワイトリスト方式で既に防がれるが、将来 allowedFields を編集する際に
 * 誤って追加されないようテストで交差チェックする(NF-01 の二重防御)。
 */
export const FORBIDDEN_FIELDS = [
  'field_10', // 報告者の氏名
  'field_11', // 報告者の電話番号
  'field_12', // 分析係記入欄(内部運用)
  'Creator',
  'Editor',
  'input_p', // 避難所の入力者名
  'input_tel', // 避難所の入力者電話番号
] as const;
