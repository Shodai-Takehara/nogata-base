import { deflateSync } from 'node:zlib';

import { decodePng } from '@/features/hazard/png';

/** テスト用の最小 PNG ビルダー(実装と独立させるため zlib と手組みチャンクで作る) */
function buildPng(options: {
  width: number;
  height: number;
  colorType: 2 | 3 | 6;
  bitDepth?: number;
  interlace?: number;
  scanlines: number[][];
  palette?: number[];
  paletteAlpha?: number[];
}): Uint8Array {
  const {
    width,
    height,
    colorType,
    bitDepth = 8,
    interlace = 0,
    scanlines,
    palette,
    paletteAlpha,
  } = options;

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf: Buffer) => {
    let c = -1;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;

  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
  ];
  if (palette) parts.push(chunk('PLTE', Buffer.from(palette)));
  if (paletteAlpha) parts.push(chunk('tRNS', Buffer.from(paletteAlpha)));
  parts.push(chunk('IDAT', deflateSync(Buffer.from(scanlines.flat()))));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return new Uint8Array(Buffer.concat(parts));
}

describe('decodePng', () => {
  it('RGBA(フィルタなし)のピクセルを読める', () => {
    const png = buildPng({
      width: 2,
      height: 1,
      colorType: 6,
      scanlines: [[0, 255, 0, 0, 255, 0, 255, 0, 128]],
    });
    const decoded = decodePng(png);
    expect(decoded.rgbaAt(0, 0)).toEqual([255, 0, 0, 255]);
    expect(decoded.rgbaAt(1, 0)).toEqual([0, 255, 0, 128]);
  });

  it('Sub / Up / Paeth フィルタを復元できる', () => {
    // 1列2行: 2行目は Up フィルタ(上のピクセルとの差分)
    const up = buildPng({
      width: 1,
      height: 2,
      colorType: 6,
      scanlines: [
        [0, 100, 100, 100, 100],
        [2, 5, 5, 5, 5],
      ],
    });
    expect(decodePng(up).rgbaAt(0, 1)).toEqual([105, 105, 105, 105]);

    // 2列1行: 2ピクセル目は Sub フィルタ(左のピクセルとの差分)
    const sub = buildPng({
      width: 2,
      height: 1,
      colorType: 6,
      scanlines: [[1, 10, 20, 30, 40, 5, 5, 5, 5]],
    });
    expect(decodePng(sub).rgbaAt(1, 0)).toEqual([15, 25, 35, 45]);

    // 1列2行: 2行目は Paeth フィルタ(左=0, 左上=0 のため上を予測子に選ぶ)
    const paeth = buildPng({
      width: 1,
      height: 2,
      colorType: 6,
      scanlines: [
        [0, 100, 100, 100, 100],
        [4, 5, 5, 5, 5],
      ],
    });
    expect(decodePng(paeth).rgbaAt(0, 1)).toEqual([105, 105, 105, 105]);
  });

  it('パレット形式(tRNS 付き)を RGBA に展開できる', () => {
    const png = buildPng({
      width: 2,
      height: 1,
      colorType: 3,
      palette: [255, 0, 0, 0, 0, 255],
      paletteAlpha: [255, 0],
      scanlines: [[0, 0, 1]],
    });
    const decoded = decodePng(png);
    expect(decoded.rgbaAt(0, 0)).toEqual([255, 0, 0, 255]);
    expect(decoded.rgbaAt(1, 0)).toEqual([0, 0, 255, 0]);
  });

  it('未対応形式(ビット深度4・インターレース)は明示的に失敗する', () => {
    const depth4 = buildPng({
      width: 1,
      height: 1,
      colorType: 3,
      bitDepth: 4,
      palette: [0, 0, 0],
      scanlines: [[0, 0]],
    });
    expect(() => decodePng(depth4)).toThrow('未対応');

    const interlaced = buildPng({
      width: 1,
      height: 1,
      colorType: 6,
      interlace: 1,
      scanlines: [[0, 1, 2, 3, 4]],
    });
    expect(() => decodePng(interlaced)).toThrow('未対応');
  });

  it('展開後のデータが不足している(壊れた)PNG は失敗する', () => {
    // 2行分を宣言しながら1行分しか入っていない PNG
    const truncated = buildPng({
      width: 1,
      height: 2,
      colorType: 6,
      scanlines: [[0, 1, 2, 3, 4]],
    });
    expect(() => decodePng(truncated)).toThrow('不足');
  });

  it('範囲外のピクセル参照は失敗する', () => {
    const png = buildPng({
      width: 1,
      height: 1,
      colorType: 6,
      scanlines: [[0, 1, 2, 3, 4]],
    });
    expect(() => decodePng(png).rgbaAt(1, 0)).toThrow('範囲外');
  });
});
