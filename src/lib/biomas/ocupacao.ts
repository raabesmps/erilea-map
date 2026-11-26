/**
 * Occupation grid: which discs (position + spacing radius) are already taken. Extracted VERBATIM from
 * proto/terrasen.ts in step 0c.2. It is the object that lets a later biome respect the symbols of an earlier one:
 * all biomes of one planning run share one `Ocupacao`.
 *
 * A candidate at distance `d` of a taken disc is refused when `d < 0.5 · (r + o.r) · 0.95`. Only the 3 × 3 cells
 * around the candidate (cells of 40 px) are looked at, so radii above ≈ 40 px would not be seen; planners use radii below 35.
 */
export interface ItemOcupado {
  x: number
  y: number
  r: number
}

export interface Ocupacao {
  /** True when a disc of radius `r` at (x, y) does not collide with anything taken. */
  livre(x: number, y: number, r: number): boolean
  /** Marks a disc as taken. */
  ocupar(x: number, y: number, r: number): void
  /** Everything taken so far, in insertion order (for tests and diagnostics). */
  itens(): readonly ItemOcupado[]
}

const CELL = 40
const chave = (cx: number, cy: number) => cx * 4096 + cy

export function criarOcupacao(): Ocupacao {
  const grade = new Map<number, ItemOcupado[]>()
  const todos: ItemOcupado[] = []
  return {
    livre(x, y, r) {
      const cx = (x / CELL) | 0
      const cy = (y / CELL) | 0
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const lista = grade.get(chave(cx + i, cy + j))
          if (!lista) continue
          for (const o of lista) if (Math.hypot(o.x - x, o.y - y) < 0.5 * (r + o.r) * 0.95) return false
        }
      }
      return true
    },
    ocupar(x, y, r) {
      const k = chave((x / CELL) | 0, (y / CELL) | 0)
      const lista = grade.get(k) ?? []
      lista.push({ x, y, r })
      grade.set(k, lista)
      todos.push({ x, y, r })
    },
    itens: () => todos,
  }
}
