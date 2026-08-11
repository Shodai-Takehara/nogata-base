import { FORBIDDEN_FIELDS, LAYERS } from '@/data/arcgis/layers';

describe('レイヤー定義(NF-01 / NF-02 の防御)', () => {
  it.each(Object.entries(LAYERS))(
    '%s のホワイトリストに個人情報・内部運用フィールドが混入していない',
    (_name, layer) => {
      for (const forbidden of FORBIDDEN_FIELDS) {
        expect(layer.allowedFields).not.toContain(forbidden);
      }
    },
  );

  it('被害報告は公開フラグで絞られている', () => {
    expect(LAYERS.damageReports.fixedWhere).toContain("field_7 = '公開'");
  });

  it('交通規制は公開フラグで絞られている', () => {
    expect(LAYERS.trafficRegulations.fixedWhere).toContain("openFlg = '公開'");
  });
});
