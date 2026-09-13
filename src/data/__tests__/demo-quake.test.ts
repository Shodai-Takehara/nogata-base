import { SHELTER_MASTER } from '@/data/demo-master';
import { demoQuakeSource } from '@/data/demo-quake';
import { demoRainSource } from '@/data/demo-rain';
import { waterStatus } from '@/domain/status';
import { expectInCity } from '@/test-utils/city-bounds';

describe('デモモードの地震シナリオ', () => {
  it('マスタの全施設を返し、地震に対応しない避難所はすべて閉鎖', async () => {
    const shelters = await demoQuakeSource.fetchShelters();
    expect(shelters).toHaveLength(SHELTER_MASTER.length);
    const unusable = shelters.filter((s) => !s.hazards.earthquake);
    expect(unusable.length).toBeGreaterThan(0);
    for (const s of unusable) {
      expect(s.opening).toBe('0');
      expect(s.refugees).toBe(0);
    }
  });

  it('対応する避難所が混雑3段階で開き、対応する施設にも閉鎖のままの所がある', async () => {
    const shelters = await demoQuakeSource.fetchShelters();
    const open = shelters.filter((s) => s.opening !== '0');
    expect(new Set(open.map((s) => s.opening))).toEqual(new Set(['1', '2', '3']));
    expect(shelters.some((s) => s.hazards.earthquake && s.opening === '0')).toBe(true);
  });

  it('避難者の内訳の合計が人数と一致し、収容可能人数を超えない', async () => {
    for (const s of await demoQuakeSource.fetchShelters()) {
      const total = s.evacuees.reduce((sum, e) => sum + (e.male ?? 0) + (e.female ?? 0), 0);
      expect(total).toBe(s.refugees);
      if (s.capacity != null) expect(s.refugees).toBeLessThanOrEqual(s.capacity);
    }
  });

  it('水位は全地点が平常(地震で水位は動かない)', async () => {
    const levels = await demoQuakeSource.fetchWaterLevels();
    expect(levels.length).toBeGreaterThan(0);
    for (const w of levels) {
      // 警戒水位の無い地点は判定できない(不明)ので、シナリオの検証から外す
      if (w.alertLevelCm != null) expect(waterStatus(w.levelCm, w.alertLevelCm)).toBe('normal');
    }
  });

  it('被害報告は瓦、段差、給水車、橋の点検、ブロック塀の5件で、座標は市域の中', async () => {
    const reports = await demoQuakeSource.fetchDamageReports();
    expect(reports.map((r) => r.category)).toEqual([
      '住家被害',
      '道路被害',
      '断水等',
      '橋りょう',
      'ブロック塀の倒壊',
    ]);
    for (const r of reports) expectInCity(r.coord);
  });

  it('交通規制は全面と一部の2件で、区間は市域の中', async () => {
    const regulations = await demoQuakeSource.fetchTrafficRegulations();
    expect(regulations.map((r) => r.status)).toEqual(['通行止め（全面）', '通行止め（一部）']);
    for (const r of regulations) {
      expect(r.path.length).toBeGreaterThanOrEqual(2);
      for (const p of r.path) expectInCity(p);
    }
  });

  it('被害報告と規制の id が大雨シナリオと重ならない(切替後に選択中の内容がすり替わらないため)', async () => {
    const ids = async (source: typeof demoQuakeSource) => ({
      reports: (await source.fetchDamageReports()).map((r) => r.id),
      regulations: (await source.fetchTrafficRegulations()).map((r) => r.id),
    });
    const quake = await ids(demoQuakeSource);
    const rain = await ids(demoRainSource);
    expect(quake.reports.filter((id) => rain.reports.includes(id))).toEqual([]);
    expect(quake.regulations.filter((id) => rain.regulations.includes(id))).toEqual([]);
  });

  it('文言に橋の名前を出さない(実在の被災事実に見せないため)', async () => {
    const texts = [
      ...(await demoQuakeSource.fetchDamageReports()).flatMap((r) => [
        r.category,
        r.workResult ?? '',
        r.hqNote ?? '',
      ]),
      ...(await demoQuakeSource.fetchTrafficRegulations()).flatMap((r) => [r.status, r.note ?? '']),
    ];
    for (const text of texts) {
      // 種別としての「橋りょう」「橋梁」は残し、固有名としての「◯◯橋」を弾く
      expect(text.replace(/橋りょう|橋梁/g, '')).not.toContain('橋');
    }
  });
});
