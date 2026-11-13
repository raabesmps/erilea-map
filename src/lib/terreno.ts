import { createNoise2D } from 'simplex-noise'

/**
 * Procedural parchment map of an invented continent. Pure canvas, no text:
 * every name is drawn by the UI so the same image serves PT and EN.
 * Replace it later by the hand-drawn art without touching the data.
 */

export const MAP_W = 2400
export const MAP_H = 1680

interface Blob {
  cx: number
  cy: number
  rx: number
  ry: number
  w: number
}

// Own interpretation of the geography. Place *positions* follow the book's map;
// the coastline itself is generated, not traced (normalised coordinates).
const BLOBS: Blob[] = [
  { cx: 0.70, cy: 0.14, rx: 0.17, ry: 0.13, w: 1 }, // Terrasen
  { cx: 0.74, cy: 0.40, rx: 0.16, ry: 0.20, w: 1 }, // Adarlan
  { cx: 0.65, cy: 0.60, rx: 0.22, ry: 0.16, w: 1 }, // centre / Melisande
  { cx: 0.82, cy: 0.58, rx: 0.09, ry: 0.07, w: 1 }, // east bulge
  { cx: 0.76, cy: 0.78, rx: 0.18, ry: 0.19, w: 1 }, // Eyllwe
  { cx: 0.66, cy: 0.86, rx: 0.10, ry: 0.10, w: 1 }, // south-west marsh
  { cx: 0.47, cy: 0.45, rx: 0.10, ry: 0.18, w: 1 }, // land bridge
  { cx: 0.24, cy: 0.52, rx: 0.23, ry: 0.45, w: 1 }, // western lands
  { cx: 0.93, cy: 0.64, rx: 0.015, ry: 0.025, w: 0.9 }, // Dead Islands
  { cx: 0.95, cy: 0.74, rx: 0.012, ry: 0.02, w: 0.9 },
  { cx: 0.5, cy: 0.93, rx: 0.04, ry: 0.03, w: 0.9 },
]

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const INK: [number, number, number] = [62, 44, 28]
const LAND: [number, number, number] = [238, 222, 182]
const LAND_HI: [number, number, number] = [214, 190, 142]
const SEA: [number, number, number] = [205, 192, 154]
const SEA_DEEP: [number, number, number] = [188, 172, 132]

export function renderTerrain(W = MAP_W, H = MAP_H, seed = 11): HTMLCanvasElement {
  const rnd = mulberry32(seed)
  const n1 = createNoise2D(rnd)
  const n2 = createNoise2D(rnd)
  const fbm = (x: number, y: number) => {
    let a = 1
    let f = 1
    let s = 0
    let t = 0
    for (let i = 0; i < 5; i++) {
      s += a * n1(x * f, y * f)
      t += a
      a *= 0.5
      f *= 2
    }
    return s / t
  }

  const elev = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W
      const ny = y / H
      const wx = nx + 0.035 * n2(nx * 3.1, ny * 3.1)
      const wy = ny + 0.035 * n2(nx * 3.1 + 9, ny * 3.1 + 9)
      let m = -1
      for (const b of BLOBS) {
        const dx = (wx - b.cx) / b.rx
        const dy = (wy - b.cy) / b.ry
        m = Math.max(m, (1 - (dx * dx + dy * dy)) * b.w)
      }
      elev[y * W + x] = m + 0.32 * fbm(x / W * 7, y / W * 7) - 0.04
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  const at = (x: number, y: number) => elev[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]!

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = elev[y * W + x]!
      const i = (y * W + x) * 4
      let r: number
      let g: number
      let b: number
      const grain = (rnd() - 0.5) * 9
      if (e > 0) {
        // land: paper with slope shading, darker toward the highlands
        const t = Math.min(1, Math.max(0, (e - 0.1) / 0.6))
        const slope = (at(x + 2, y + 2) - at(x - 2, y - 2)) * 60
        r = LAND[0] + (LAND_HI[0] - LAND[0]) * t - slope + grain
        g = LAND[1] + (LAND_HI[1] - LAND[1]) * t - slope + grain
        b = LAND[2] + (LAND_HI[2] - LAND[2]) * t - slope * 0.8 + grain
        // coastline ink
        if (at(x - 2, y) <= 0 || at(x + 2, y) <= 0 || at(x, y - 2) <= 0 || at(x, y + 2) <= 0) {
          r = INK[0]
          g = INK[1]
          b = INK[2]
        }
      } else {
        const depth = -e
        const t = Math.min(1, depth / 0.5)
        r = SEA[0] + (SEA_DEEP[0] - SEA[0]) * t + grain
        g = SEA[1] + (SEA_DEEP[1] - SEA[1]) * t + grain
        b = SEA[2] + (SEA_DEEP[2] - SEA[2]) * t + grain
        // shore shadow
        if (depth < 0.03) {
          const k = (1 - depth / 0.03) * 22
          r -= k
          g -= k
          b -= k
        }
        // engraved wave hatching near the coast
        if (depth > 0.035 && depth < 0.075 && (x + y) % 9 === 0) {
          r -= 26
          g -= 26
          b -= 22
        } else if (depth > 0.09 && depth < 0.115 && (x - y + H) % 11 === 0) {
          r -= 16
          g -= 16
          b -= 14
        }
      }
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  drawGlyphs(ctx, W, H, at, rnd, n2)
  drawAging(ctx, W, H)
  drawFrame(ctx, W, H)
  drawCompass(ctx, W * 0.95, H * 0.905, 54)
  return canvas
}

function drawGlyphs(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  at: (x: number, y: number) => number,
  rnd: () => number,
  noise: (x: number, y: number) => number,
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const step = 26
  for (let gy = 90; gy < H - 90; gy += step) {
    for (let gx = 90; gx < W - 90; gx += step) {
      const x = gx + (rnd() - 0.5) * step * 0.9
      const y = gy + (rnd() - 0.5) * step * 0.9
      const e = at(Math.round(x), Math.round(y))
      if (e < 0.08) continue
      // low-frequency noise groups the glyphs into mountain ranges and woods
      const range = noise((x / W) * 5 + 30, (y / W) * 5 + 30)
      const wood = noise((x / W) * 6 + 60, (y / W) * 6)
      if (range > 0.28 && e > 0.18 && rnd() < 0.65) {
        mountain(ctx, x, y, 12 + rnd() * 10)
      } else if (wood > 0.12 && e > 0.1 && rnd() < 0.55) {
        tree(ctx, x, y, 6 + rnd() * 4)
      } else if (rnd() < 0.025) {
        hill(ctx, x, y, 10 + rnd() * 6)
      }
    }
  }
}

function mountain(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(x - s * 0.1, y - s * 1.35)
  ctx.lineTo(x + s, y)
  ctx.closePath()
  ctx.fillStyle = 'rgba(244,232,198,0.95)'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - s * 0.1, y - s * 1.35)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + s * 0.1, y)
  ctx.closePath()
  ctx.fillStyle = 'rgba(92,68,42,0.5)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(62,44,28,0.9)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(x - s * 0.1, y - s * 1.35)
  ctx.lineTo(x + s, y)
  ctx.stroke()
}

function hill(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = 'rgba(62,44,28,0.7)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(x, y, s, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(96,104,60,0.55)'
  ctx.strokeStyle = 'rgba(62,44,28,0.85)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(x, y - s * 0.5, s * 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.2)
  ctx.lineTo(x, y + s * 0.9)
  ctx.stroke()
}

function drawAging(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72)
  g.addColorStop(0, 'rgba(120,80,30,0)')
  g.addColorStop(1, 'rgba(90,52,18,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const a = 26
  const b = 46
  ctx.fillStyle = 'rgba(236,220,178,0.97)'
  // border strip
  ctx.fillRect(0, 0, W, a)
  ctx.fillRect(0, H - a, W, a)
  ctx.fillRect(0, 0, a, H)
  ctx.fillRect(W - a, 0, a, H)
  ctx.strokeStyle = 'rgb(62,44,28)'
  ctx.lineWidth = 4
  ctx.strokeRect(a, a, W - a * 2, H - a * 2)
  ctx.lineWidth = 1.5
  ctx.strokeRect(b, b, W - b * 2, H - b * 2)
  // checker graduation between both lines
  ctx.fillStyle = 'rgb(62,44,28)'
  const seg = 36
  for (let x = b, i = 0; x < W - b - seg; x += seg, i++) {
    if (i % 2 === 0) {
      ctx.fillRect(x, a + 2, seg, b - a - 4)
      ctx.fillRect(x, H - b + 2, seg, b - a - 4)
    }
  }
  for (let y = b, i = 0; y < H - b - seg; y += seg, i++) {
    if (i % 2 === 0) {
      ctx.fillRect(a + 2, y, b - a - 4, seg)
      ctx.fillRect(W - b + 2, y, b - a - 4, seg)
    }
  }
  // outer edge
  ctx.strokeStyle = 'rgb(62,44,28)'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, W - 6, H - 6)
}

function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = 'rgb(62,44,28)'
  ctx.fillStyle = 'rgb(62,44,28)'
  ctx.lineWidth = 2
  for (const k of [1, 0.78, 0.5]) {
    ctx.beginPath()
    ctx.arc(0, 0, r * k, 0, Math.PI * 2)
    ctx.stroke()
  }
  const star = (len: number, wid: number, rot: number, fill: string) => {
    ctx.save()
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.moveTo(0, -len)
    ctx.lineTo(wid, 0)
    ctx.lineTo(0, len)
    ctx.lineTo(-wid, 0)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
  star(r * 0.8, r * 0.13, Math.PI / 4, 'rgba(236,220,178,0.9)')
  star(r * 0.8, r * 0.13, -Math.PI / 4, 'rgba(236,220,178,0.9)')
  star(r * 1.25, r * 0.17, 0, 'rgba(236,220,178,0.95)')
  star(r * 1.25, r * 0.17, Math.PI / 2, 'rgba(236,220,178,0.95)')
  // north point in wax red, drawn without lettering
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.25)
  ctx.lineTo(r * 0.17, 0)
  ctx.lineTo(-r * 0.17, 0)
  ctx.closePath()
  ctx.fillStyle = 'rgb(122,46,43)'
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2)
  ctx.fillStyle = 'rgb(62,44,28)'
  ctx.fill()
  ctx.restore()
}
