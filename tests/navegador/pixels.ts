/** Pixel-by-pixel comparison of two RGBA buffers, plus a dependency-free PNG writer for diff images. */
import { deflateSync } from 'node:zlib'

export interface RelatorioPixels {
  iguais: boolean
  pixelsDiferentes: number
  percentual: number
  maiorDiferenca: number
  /** Bounding box of the differing pixels, in pixels (x0, y0, x1, y1), or null when equal. */
  caixa: [number, number, number, number] | null
  /** How many differing pixels fall into each 160 px cell, largest first (to locate the change). */
  celulas: { x: number; y: number; n: number }[]
}

export function compararPixels(a: Uint8Array, b: Uint8Array, W: number, H: number): RelatorioPixels {
  if (a.length !== b.length || a.length !== W * H * 4) throw new Error(`buffers com tamanhos diferentes (${a.length} x ${b.length}, esperado ${W * H * 4})`)
  let n = 0
  let maior = 0
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  const cel = new Map<number, number>()
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!), Math.abs(a[i + 3]! - b[i + 3]!))
    if (d === 0) continue
    n++
    if (d > maior) maior = d
    const x = p % W
    const y = (p / W) | 0
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
    const k = ((y / 160) | 0) * 1000 + ((x / 160) | 0)
    cel.set(k, (cel.get(k) ?? 0) + 1)
  }
  const celulas = [...cel.entries()].map(([k, c]) => ({ x: (k % 1000) * 160, y: Math.floor(k / 1000) * 160, n: c })).sort((p, q) => q.n - p.n).slice(0, 8)
  return { iguais: n === 0, pixelsDiferentes: n, percentual: +((n / (W * H)) * 100).toFixed(4), maiorDiferenca: maior, caixa: n ? [x0, y0, x1, y1] : null, celulas }
}

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 255]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(tipo: string, dados: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + dados.length)
  out.writeUInt32BE(dados.length, 0)
  out.write(tipo, 4, 'ascii')
  Buffer.from(dados).copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + dados.length)), 8 + dados.length)
  return out
}

/** Encodes an RGBA buffer as PNG (no filter, zlib level 6). */
export function pngDe(rgba: Uint8Array, W: number, H: number): Buffer {
  const raw = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', new Uint8Array(0))])
}

/** Diff image: equal pixels dimmed to grey, differing pixels in red (amplified). */
export function pngDiferencas(a: Uint8Array, b: Uint8Array, W: number, H: number): Buffer {
  const out = new Uint8Array(W * H * 4)
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!))
    if (d === 0) {
      const g = ((a[i]! + a[i + 1]! + a[i + 2]!) / 3) * 0.35
      out[i] = out[i + 1] = out[i + 2] = g
    } else {
      out[i] = 255
      out[i + 1] = Math.max(0, 120 - d)
      out[i + 2] = 0
    }
    out[i + 3] = 255
  }
  return pngDe(out, W, H)
}
