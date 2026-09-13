import { normalizeSettings } from '@/state/settings';

describe('保存済み設定の読み込み', () => {
  it('項目の無い古い保存は既定値で埋まる(シナリオは大雨)', () => {
    const settings = normalizeSettings({ demoMode: true, textSize: 'large' });
    expect(settings.demoMode).toBe(true);
    expect(settings.textSize).toBe('large');
    expect(settings.demoScenario).toBe('rain');
    expect(settings.easyJapanese).toBe(false);
    expect(settings.homePin).toBeNull();
  });

  it('保存された選択肢の値は保たれる', () => {
    const settings = normalizeSettings({ demoScenario: 'quake', textSize: 'xlarge' });
    expect(settings.demoScenario).toBe('quake');
    expect(settings.textSize).toBe('xlarge');
  });

  it('今の選択肢に無い値(改名や手で書き換えた保存)は既定値へ戻る', () => {
    const settings = normalizeSettings({ demoScenario: 'flood', textSize: 'huge' });
    expect(settings.demoScenario).toBe('rain');
    expect(settings.textSize).toBe('standard');
  });
});
