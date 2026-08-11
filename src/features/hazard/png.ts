import { unzlibSync } from 'fflate';

/**
 * ハザードタイルの1ピクセルを読むための最小 PNG デコーダ。
 * React Native には画像のピクセルを読む標準手段がないため自前で持つ。
 * 対応はタイルで実際に使われる形式に限定する:
 * ビット深度8の RGB(2)/パレット(3)/RGBA(6)、非インターレース。
 */

export type Rgba = [number, number, number, number];

export type DecodedPng = {
  width: number;
  height: number;
  rgbaAt(x: number, y: number): Rgba;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function decodePng(bytes: Uint8Array): DecodedPng {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) throw new Error('PNG ではありません');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let paletteAlpha: Uint8Array | null = null;
  const idatParts: Uint8Array[] = [];

  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(
      bytes[pos + 4],
      bytes[pos + 5],
      bytes[pos + 6],
      bytes[pos + 7],
    );
    const dataStart = pos + 8;
    if (type === 'IHDR') {
      width = view.getUint32(dataStart);
      height = view.getUint32(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlace = bytes[dataStart + 12];
    } else if (type === 'PLTE') {
      palette = bytes.slice(dataStart, dataStart + length);
    } else if (type === 'tRNS') {
      paletteAlpha = bytes.slice(dataStart, dataStart + length);
    } else if (type === 'IDAT') {
      idatParts.push(bytes.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }
    pos = dataStart + length + 4;
  }

  if (bitDepth !== 8 || interlace !== 0 || ![2, 3, 6].includes(colorType)) {
    throw new Error(`未対応の PNG 形式です(depth=${bitDepth}, color=${colorType})`);
  }
  if (colorType === 3 && palette == null) {
    throw new Error('パレット PNG に PLTE がありません');
  }

  const idat = concat(idatParts);
  // IDAT は zlib ラップ付き deflate(生 deflate ではない)
  const raw = unzlibSync(idat);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const pixels = unfilter(raw, width, height, bpp);

  return {
    width,
    height,
    rgbaAt(x: number, y: number): Rgba {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        throw new Error(`範囲外のピクセル参照: (${x}, ${y})`);
      }
      const o = (y * width + x) * bpp;
      if (colorType === 6) {
        return [pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]];
      }
      if (colorType === 2) {
        return [pixels[o], pixels[o + 1], pixels[o + 2], 255];
      }
      const index = pixels[o];
      const p = index * 3;
      const alpha = paletteAlpha != null && index < paletteAlpha.length ? paletteAlpha[index] : 255;
      return [palette![p], palette![p + 1], palette![p + 2], alpha];
    },
  };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** PNG のライン先頭フィルタ(None/Sub/Up/Average/Paeth)を復元する */
function unfilter(raw: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  // 長さ不足をゼロ埋めで読み進めると誤った色(=誤った浸水深)を返してしまう
  if (raw.length < height * (stride + 1)) {
    throw new Error('展開後のデータ長が不足しています(壊れた PNG の可能性)');
  }
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const i = y * (stride + 1) + 1 + x;
      const o = y * stride + x;
      const left = x >= bpp ? out[o - bpp] : 0;
      const up = y > 0 ? out[o - stride] : 0;
      const upLeft = x >= bpp && y > 0 ? out[o - stride - bpp] : 0;
      let value = raw[i];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      out[o] = value & 0xff;
    }
  }
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}
