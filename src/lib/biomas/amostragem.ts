/**
 * Low-level sampling helpers shared by the biome planners (moved VERBATIM out of proto/terrasen.ts in step 0c.2):
 * the deterministic hash (the planners never touch the map's shared random stream), the smoothstep, the feathered
 * zone weight and the priority-ordered candidate grid used by the blue-noise dart throwing.
 */

/** Smoothstep of `t` between `a` and `b`. */
export const sm = (a: number, b: number, t: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** Deterministic hash in [0,1): the prototype never touches the shared random stream. */
export function h2(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Feathered share (0..1) of the surroundings that belong to the chosen zones. */
export function criarPeso(
  field: { best: Uint8Array; LW: number },
  zonas: { id: string }[],
  pertence: (id: string) => boolean,
  S = 4,
): (x: number, y: number) => number {
  const LH = field.best.length / field.LW
  const em = (x: number, y: number) => {
    const cx = (x / S) | 0
    const cy = (y / S) | 0
    if (x < 0 || y < 0 || cx >= field.LW || cy >= LH) return 0
    const bi = field.best[cy * field.LW + cx]!
    return bi !== 255 && pertence(zonas[bi]!.id) ? 1 : 0
  }
  return (x, y) => {
    let s = em(x, y) * 2
    let n = 2
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      s += em(x + Math.cos(a) * 24, y + Math.sin(a) * 24)
      s += em(x + Math.cos(a) * 48, y + Math.sin(a) * 48) * 0.7
      n += 1.7
    }
    return s / n
  }
}

export interface Candidato {
  x: number
  y: number
  pri: number
}

/**
 * Jittered candidate points over a window, in descending priority: the order in which the dart throwing tries them.
 * Each cell `(gx, gy)` is jittered and prioritised by the hash seeds 1, 2 and 3, and the sort is stable, so the same
 * window and step always give the same sequence. Terrasen's forest masses use `(0.5·W, 0, 0.92·W, 0.32·H, 8)`.
 */
export function candidatosPorPrioridade(x0: number, y0: number, x1: number, y1: number, passo: number): Candidato[] {
  const cand: Candidato[] = []
  for (let gy = y0; gy < y1; gy += passo) {
    for (let gx = x0; gx < x1; gx += passo) {
      cand.push({ x: gx + (h2(gx, gy, 1) - 0.5) * passo, y: gy + (h2(gx, gy, 2) - 0.5) * passo, pri: h2(gx, gy, 3) })
    }
  }
  cand.sort((a, b) => b.pri - a.pri)
  return cand
}
