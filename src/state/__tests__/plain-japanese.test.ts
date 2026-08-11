import { HAZARD_LAYERS } from '@/constants/hazard-map';
import {
  AGE_BRACKET_LABEL,
  AGE_BRACKET_LABEL_EASY,
  HAZARD_TYPE_LABEL,
  HAZARD_TYPE_LABEL_EASY,
  SHELTER_OPENING_LABEL,
  SHELTER_OPENING_LABEL_EASY,
  WATER_KIND_LABEL,
  WATER_KIND_LABEL_EASY,
  WATER_STATUS_LABEL,
  WATER_STATUS_LABEL_EASY,
} from '@/domain/status';
import { PLAIN_JAPANESE_COPY } from '@/state/plain-japanese-copy';

// 平易版の入れ忘れ(キー欠落・空文字・標準の丸写し)を検出する。
// 一部だけ対応された状態を「全部対応済み」と誤認しないための防御。
describe('やさしい日本語の網羅', () => {
  const labelPairs: [string, Record<string, string>, Record<string, string>][] = [
    ['水位の状態', WATER_STATUS_LABEL, WATER_STATUS_LABEL_EASY],
    ['避難所の開設状況', SHELTER_OPENING_LABEL, SHELTER_OPENING_LABEL_EASY],
    ['災害種別', HAZARD_TYPE_LABEL, HAZARD_TYPE_LABEL_EASY],
    ['年齢区分', AGE_BRACKET_LABEL, AGE_BRACKET_LABEL_EASY],
    ['観測点種別', WATER_KIND_LABEL, WATER_KIND_LABEL_EASY],
  ];

  it.each(labelPairs)('%s のラベルは標準と同じキーをすべて平易版で持つ', (_name, std, easy) => {
    expect(Object.keys(easy).sort()).toEqual(Object.keys(std).sort());
    for (const label of Object.values(easy)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('固定文言カタログは標準を空でなく持ち、平易版があるものは標準と異なる', () => {
    for (const entry of Object.values(PLAIN_JAPANESE_COPY)) {
      const { standard, easy } = entry as { standard: string; easy?: string };
      expect(standard.trim().length).toBeGreaterThan(0);
      if (easy != null) {
        expect(easy.trim().length).toBeGreaterThan(0);
        expect(easy).not.toBe(standard);
      }
    }
  });

  it('ハザードレイヤーのチップ名は全レイヤーが平易版を持つ', () => {
    for (const layer of HAZARD_LAYERS) {
      expect(layer.labelEasy.trim().length).toBeGreaterThan(0);
      // 用語の意味を保つ方針のため、平易版は元の語を含む(読みを添える形)
      expect(layer.labelEasy).toContain(layer.label);
    }
  });
});
