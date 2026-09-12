import { QUAKE_BUCKETS, QUAKE_META, type QuakeCell } from '@/constants/quake-map';
import { PLAIN_JAPANESE_COPY, type CopyKey } from '@/state/plain-japanese-copy';
import { formatProbability, groundLabel, quakeDetail } from '@/state/quake-detail';

const copy = Object.fromEntries(
  Object.entries(PLAIN_JAPANESE_COPY).map(([key, entry]) => [key, entry.standard]),
) as Record<CopyKey, string>;

/** 市役所付近のセル(5030458834)の値。API が 2026-09-12 に返したもの */
const CELL: QuakeCell = {
  p50: 0.389915,
  p55: 0.095169,
  p60: 0.020773,
  si: 5.8,
  arv: 1.84,
  jcode: 12,
  jname: '自然堤防',
};

describe('地震ハザードの詳細に出す値', () => {
  it('確率は百分率の小数1桁にする(四捨五入)', () => {
    expect(formatProbability(0.095169)).toBe('9.5%');
    expect(formatProbability(0.389915)).toBe('39.0%');
    expect(formatProbability(0.005144)).toBe('0.5%');
    expect(formatProbability(0.02995)).toBe('3.0%');
    expect(formatProbability(0)).toBe('0.0%');
  });

  it('区分は丸める前の値で決める(2.9956% は 3.0% と出ても 0.1〜3% の区分)', () => {
    const detail = quakeDetail({ ...CELL, p55: 0.029956 }, copy, false);
    expect(detail.main.value).toBe('3.0%');
    expect(detail.main.bucket).toBe('0.1〜3%');
  });

  it('主値には区分名と凡例と同じ色を添える', () => {
    const detail = quakeDetail(CELL, copy, false);
    expect(detail.main).toEqual({
      label: copy.quakeP55Label,
      value: '9.5%',
      bucket: '6〜26%',
      color: QUAKE_BUCKETS[3].fill,
    });
  });

  it('副値は震度5強以上、6強以上の順で、地盤と増幅率が続く', () => {
    const detail = quakeDetail(CELL, copy, false);
    expect(detail.subs).toEqual([
      { label: copy.quakeP50Label, value: '39.0%' },
      { label: copy.quakeP60Label, value: '2.1%' },
    ]);
    expect(detail.ground).toBe('自然堤防');
    expect(detail.amplification).toBe('1.84倍');
  });

  it('データに無い値(null)の行は出さない', () => {
    const detail = quakeDetail({ ...CELL, p50: null, p60: null, arv: null }, copy, false);
    expect(detail.subs).toEqual([]);
    expect(detail.amplification).toBeNull();
  });

  it('やさしい日本語モードでは微地形区分に読みを添え、読みが無い名称はそのまま出す', () => {
    expect(groundLabel('自然堤防', true)).toBe('自然堤防(しぜん ていぼう)');
    expect(groundLabel('自然堤防', false)).toBe('自然堤防');
    expect(groundLabel('埋立地', true)).toBe('埋立地');
  });

  it('メッシュ幅の注記は同梱データのメッシュ幅と一致する(--mesh 500 で作り直したら書き換える)', () => {
    expect(PLAIN_JAPANESE_COPY.quakeMeshNote.standard).toContain(`${QUAKE_META.mesh}m`);
    expect(PLAIN_JAPANESE_COPY.quakeMeshNote.easy).toContain(`${QUAKE_META.mesh}m`);
  });
});
