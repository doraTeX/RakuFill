// 外部依存なしで RakuFill のアイコン PNG を生成する。
// モチーフ: 角丸のインディゴ地に、フォームの行を表す白いバー 3 本（最下段は「入力済み」のアンバー）。
// スーパーサンプリング（高解像度で描画してから平均縮小）でアンチエイリアスをかけている。
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const storeAssetsDir = join(root, "store-assets");
mkdirSync(iconsDir, { recursive: true });
mkdirSync(storeAssetsDir, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [79, 70, 229]; // indigo
const BAR = [255, 255, 255];
const ACCENT = [251, 191, 36]; // amber

// 角丸矩形の内側かどうか
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

// big（= size * ss）解像度で 1 ピクセルの色/不透明度を決める
function pixelAt(x, y, big) {
  const m = big / 16; // 16px グリッド基準の倍率
  const bars = [
    { y0: 3.5 * m, y1: 5.5 * m, x1: 12.5 * m, color: BAR },
    { y0: 7 * m, y1: 9 * m, x1: 10.5 * m, color: BAR },
    { y0: 10.5 * m, y1: 12.5 * m, x1: 12.5 * m, color: ACCENT },
  ];
  if (!inRoundedRect(x, y, m, m, big - 1 - m, big - 1 - m, 3 * m)) return null;
  for (const b of bars) {
    if (inRoundedRect(x, y, 3.5 * m, b.y0, b.x1, b.y1, (b.y1 - b.y0) / 2)) return b.color;
  }
  return BG;
}

/**
 * size x size の PNG 用 RGBA バッファを、ss 倍の解像度で描画してから
 * プリマルチプライド平均でダウンサンプルして返す（アンチエイリアス）。
 */
function drawIcon(size, ss = 8) {
  const big = size * ss;
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (let sy = 0; sy < ss; sy++) {
        const by = y * ss + sy;
        for (let sx = 0; sx < ss; sx++) {
          const bx = x * ss + sx;
          const color = pixelAt(bx, by, big);
          if (color) {
            rSum += color[0];
            gSum += color[1];
            bSum += color[2];
            aSum += 255;
          }
        }
      }
      const samples = ss * ss;
      const alpha = aSum / samples;
      const i = (y * size + x) * 4;
      if (aSum > 0) {
        rgba[i] = Math.round(rSum / (aSum / 255));
        rgba[i + 1] = Math.round(gSum / (aSum / 255));
        rgba[i + 2] = Math.round(bSum / (aSum / 255));
      }
      rgba[i + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, rgba);
}

for (const size of [16, 48, 128]) {
  const file = join(iconsDir, `icon${size}.png`);
  writeFileSync(file, drawIcon(size, size <= 48 ? 8 : 4));
  console.log(`wrote ${file}`);
}

// Chrome ウェブストア掲載用の高解像度アイコン（128x128、単体で審査画面にアップロードする）
const storeIconFile = join(storeAssetsDir, "icon-128.png");
writeFileSync(storeIconFile, drawIcon(128, 8));
console.log(`wrote ${storeIconFile}`);
