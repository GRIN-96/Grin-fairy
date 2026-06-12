// 버섯집 앱 아이콘 PNG 생성 (Electron 버전 src/main/index.ts의 createTrayIcon 이식)
// 사용법: node scripts/gen-icon.mjs → scripts/icon-source.png (1024x1024)
// 이후: npx tauri icon scripts/icon-source.png
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

function crc32(buf) {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size, getPixel) {
  const bpp = 4
  const raw = Buffer.allocUnsafe(size * (1 + size * bpp))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * bpp)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y)
      const off = y * (1 + size * bpp) + 1 + x * bpp
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a
    }
  }
  const compressed = deflateSync(raw)
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const size = 1024
const buf = makePNG(size, (x, y) => {
  const cx = size / 2
  // mushroom cap (ellipse top half)
  const nx = (x - cx) / (size * 0.46)
  const ny = (y - size * 0.32) / (size * 0.30)
  if (nx * nx + ny * ny <= 1 && y < size * 0.55) {
    return [195, 177, 225, 255] // lavender cap
  }
  // body
  if (y >= size * 0.50 && y <= size * 0.92 && x >= size * 0.22 && x <= size * 0.78) {
    // door
    if (y >= size * 0.66 && x >= size * 0.38 && x <= size * 0.62) {
      return [138, 90, 52, 255] // brown door
    }
    return [240, 228, 208, 255] // cream body
  }
  return [0, 0, 0, 0]
})

const out = join(dirname(fileURLToPath(import.meta.url)), 'icon-source.png')
writeFileSync(out, buf)
console.log(`written: ${out}`)
