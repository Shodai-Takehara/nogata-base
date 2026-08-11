/**
 * 地図ピン画像の生成スクリプト。
 *
 *   node scripts/generate-map-pins.js
 *
 * assets/map-pins/templates/*.svg の {{...}} を状態色で置換し、
 * @2x/@3x の PNG を assets/map-pins/ に書き出す。
 *
 * react-native-svg の子ビューは New Architecture でタップ時に描画が
 * 消える既知問題があるため、Marker にはこのスクリプトで生成した PNG を
 * Image の子ビューとして渡す(詳細は src/app/(tabs)/index.tsx のコメント)。
 * 図柄を変えるときはテンプレートを編集してこのスクリプトを再実行する。
 */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

/** src/constants/tokens.ts の AppColors と揃えること */
const COLORS = {
  ok: '#2F8F6B',
  caution: '#D97E00',
  danger: '#C6372F',
  none: '#B8BDC2',
  waterCalm: '#3D9BCF',
  primary: '#1E4E79',
};

const TEMPLATE_DIR = path.join(__dirname, '..', 'assets', 'map-pins', 'templates');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'map-pins');

/**
 * widthPt はアプリ上の表示幅(pt)。避難所 > 車中泊 > 水位 の順に
 * 小さくして情報の重要度を表す。高さはテンプレートの縦横比に従う。
 */
const JOBS = [
  // 避難所: リング色 = 開設状況
  { out: 'shelter-none', template: 'shelter-pin.svg', vars: { ring: COLORS.none }, widthPt: 28 },
  { out: 'shelter-ok', template: 'shelter-pin.svg', vars: { ring: COLORS.ok }, widthPt: 28 },
  {
    out: 'shelter-caution',
    template: 'shelter-pin.svg',
    vars: { ring: COLORS.caution },
    widthPt: 28,
  },
  {
    out: 'shelter-danger',
    template: 'shelter-pin.svg',
    vars: { ring: COLORS.danger },
    widthPt: 28,
  },
  // 水位観測点: 地色 = 状態。平常は緑だと避難所と紛れるため水色
  { out: 'water-calm', template: 'water-pin.svg', vars: { color: COLORS.waterCalm }, widthPt: 20 },
  {
    out: 'water-caution',
    template: 'water-pin.svg',
    vars: { color: COLORS.caution },
    widthPt: 20,
  },
  { out: 'water-danger', template: 'water-pin.svg', vars: { color: COLORS.danger }, widthPt: 20 },
  { out: 'water-unknown', template: 'water-pin.svg', vars: { color: COLORS.none }, widthPt: 20 },
  // 車中泊避難所
  { out: 'car-shelter', template: 'car-pin.svg', vars: { color: COLORS.primary }, widthPt: 24 },
  // 被害報告: 交通規制の線(赤)と紛れないよう橙にする
  {
    out: 'damage-report',
    template: 'damage-pin.svg',
    vars: { color: COLORS.caution },
    widthPt: 22,
  },
];

/** iPhone は 2x/3x のみで足りるが、資産解決の取りこぼしを避けて 1x も置く */
const SCALES = [1, 2, 3];

for (const job of JOBS) {
  const template = fs.readFileSync(path.join(TEMPLATE_DIR, job.template), 'utf8');
  const svg = Object.entries(job.vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template,
  );
  if (svg.includes('{{')) {
    throw new Error(`${job.template}: 未置換のプレースホルダが残っています`);
  }
  for (const scale of SCALES) {
    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: job.widthPt * scale },
    })
      .render()
      .asPng();
    const suffix = scale === 1 ? '' : `@${scale}x`;
    fs.writeFileSync(path.join(OUT_DIR, `${job.out}${suffix}.png`), png);
  }
  console.log(`generated: ${job.out} (${SCALES.length} scales)`);
}
