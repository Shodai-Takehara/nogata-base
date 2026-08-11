/**
 * AR 水面テクスチャの生成スクリプト。
 * 外部素材を使わず、出自をコードで示すためにプログラム生成する(ライセンス問題の回避)。
 * 実行: node scripts/generate-water-textures.js
 * 出力: assets/ar/water-{muddy,clear}.png, assets/ar/water-normal.png
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

// ---- PNG エンコーダ(RGBA / 非インターレース) ----

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 各走査線の先頭にフィルタ種別(0=None)を付ける
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- タイル可能な波の高さ場 ----

// 再現性のためのシード付き乱数(実行のたびにテクスチャが変わらないように)
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// 整数周波数の正弦波の重ね合わせ。周期が SIZE で割り切れるため端がつながる
function makeHeightField() {
  const rand = makeRandom(20260714);
  const waves = [];
  const freqs = [1, 2, 2, 3, 4, 5, 6, 8];
  for (const f of freqs) {
    const angle = rand() * Math.PI * 2;
    waves.push({
      fx: Math.round(Math.cos(angle) * f),
      fy: Math.round(Math.sin(angle) * f),
      phase: rand() * Math.PI * 2,
      amp: 1 / (f + 0.5),
    });
  }
  const h = new Float64Array(SIZE * SIZE);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let v = 0;
      for (const w of waves) {
        v += w.amp * Math.sin(((w.fx * x + w.fy * y) / SIZE) * Math.PI * 2 + w.phase);
      }
      h[y * SIZE + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < h.length; i++) h[i] = (h[i] - min) / (max - min);
  return h;
}

// ---- 出力 ----

function writeDiffuse(h, file, base, crest, trough, foamThreshold) {
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const t = h[i];
    let r;
    let g;
    let b;
    if (t < 0.5) {
      const k = t / 0.5;
      r = trough[0] + (base[0] - trough[0]) * k;
      g = trough[1] + (base[1] - trough[1]) * k;
      b = trough[2] + (base[2] - trough[2]) * k;
    } else {
      const k = (t - 0.5) / 0.5;
      r = base[0] + (crest[0] - base[0]) * k;
      g = base[1] + (crest[1] - base[1]) * k;
      b = base[2] + (crest[2] - base[2]) * k;
    }
    // 波頭のごく一部を白く飛ばして泡に見せる
    if (t > foamThreshold) {
      const k = (t - foamThreshold) / (1 - foamThreshold);
      r += (235 - r) * k;
      g += (232 - g) * k;
      b += (225 - b) * k;
    }
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
  fs.writeFileSync(file, encodePng(rgba, SIZE));
}

function writeNormal(h, file, strength) {
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  const at = (x, y) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * SIZE + x) * 4;
      rgba[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      rgba[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      rgba[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      rgba[i + 3] = 255;
    }
  }
  fs.writeFileSync(file, encodePng(rgba, SIZE));
}

const outDir = path.join(__dirname, '..', 'assets', 'ar');
fs.mkdirSync(outDir, { recursive: true });

const height = makeHeightField();
// 泥水: 濁流の茶。真水: 青緑。いずれも波の谷を暗く、頂を明るく
writeDiffuse(
  height,
  path.join(outDir, 'water-muddy.png'),
  [110, 91, 51],
  [156, 133, 88],
  [72, 58, 32],
  0.93,
);
writeDiffuse(
  height,
  path.join(outDir, 'water-clear.png'),
  [46, 110, 142],
  [120, 176, 198],
  [22, 66, 92],
  0.95,
);
writeNormal(height, path.join(outDir, 'water-normal.png'), 6);

console.log('generated:', fs.readdirSync(outDir).join(', '));
