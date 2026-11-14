/**
 * EXPERIMENTAL (vector layer). Records the subset of CanvasRenderingContext2D used by the Terrasen glyph
 * drawing functions and turns it into SVG <path> elements, so the vector layer reuses the SAME drawing code
 * as the raster and the two cannot drift apart. Anything unsupported throws on purpose.
 */
type M = [number, number, number, number, number, number]

const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

const f = (v: number) => (Math.round(v * 100) / 100).toString()

export class GravadorSvg {
  fillStyle = '#000'
  strokeStyle = '#000'
  lineWidth = 1
  lineJoin = 'miter'
  lineCap = 'butt'
  elementos: string[] = []
  /** Optional colour transform applied to every fill/stroke written (used for the sepia paper integration). */
  private readonly cor: (css: string) => string
  constructor(cor: (css: string) => string = (c) => c) {
    this.cor = cor
  }
  private d: string[] = []
  private m: M = [1, 0, 0, 1, 0, 0]
  private pilha: { m: M; fs: string; ss: string; lw: number }[] = []

  save() {
    this.pilha.push({ m: [...this.m] as M, fs: this.fillStyle, ss: this.strokeStyle, lw: this.lineWidth })
  }
  restore() {
    const s = this.pilha.pop()
    if (!s) return
    this.m = s.m
    this.fillStyle = s.fs
    this.strokeStyle = s.ss
    this.lineWidth = s.lw
  }
  translate(x: number, y: number) {
    this.m = mul(this.m, [1, 0, 0, 1, x, y])
  }
  rotate(a: number) {
    const c = Math.cos(a)
    const s = Math.sin(a)
    this.m = mul(this.m, [c, s, -s, c, 0, 0])
  }
  private p(x: number, y: number): [number, number] {
    const [a, b, c, d, e, g] = this.m
    return [a * x + c * y + e, b * x + d * y + g]
  }
  beginPath() {
    this.d = []
  }
  moveTo(x: number, y: number) {
    const [X, Y] = this.p(x, y)
    this.d.push(`M${f(X)} ${f(Y)}`)
  }
  lineTo(x: number, y: number) {
    const [X, Y] = this.p(x, y)
    this.d.push(`L${f(X)} ${f(Y)}`)
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    const [CX, CY] = this.p(cx, cy)
    const [X, Y] = this.p(x, y)
    this.d.push(`Q${f(CX)} ${f(CY)} ${f(X)} ${f(Y)}`)
  }
  closePath() {
    this.d.push('Z')
  }
  fill() {
    this.elementos.push(`<path d="${this.d.join('')}" fill="${this.cor(this.fillStyle)}" stroke="none"/>`)
  }
  stroke() {
    this.elementos.push(
      `<path d="${this.d.join('')}" fill="none" stroke="${this.cor(this.strokeStyle)}" stroke-width="${f(this.lineWidth)}" stroke-linejoin="${this.lineJoin}" stroke-linecap="${this.lineCap}"/>`,
    )
  }
  clip(): never {
    throw new Error('clip() is not supported by the recorder (style C mountains use it)')
  }
}
