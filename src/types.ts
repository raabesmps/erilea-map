export type Lang = 'pt' | 'en'
export type Localized = Record<Lang, string>

export type PlaceType =
  | 'cidade'
  | 'fortaleza'
  | 'floresta'
  | 'montanha'
  | 'regiao'
  | 'porto'
  | 'mina'
  | 'saida'
  | 'mar'

export interface Note {
  /** First book in which this note is safe to show. */
  livro: number
  pt: string
  en: string
}

export type IconKey = PlaceType | 'vidro' | 'muralha'

/** Where the place sits relative to the coastline, checked by the geography tests. */
export type GeoKind = 'terra' | 'costa' | 'mar'

export interface Place {
  id: string
  geo: GeoKind
  /** The name was read with low confidence from the printed map: review later. */
  revisar?: boolean
  /** Optional special icon that overrides the one implied by `tipo`. */
  icone?: 'vidro' | 'muralha'
  /** Normalised position over the map image (0..1). */
  x: number
  y: number
  tipo: PlaceType
  /** First book in which the place appears. */
  livro: number
  nome: Localized
  notas: Note[]
}

export interface Route {
  id: string
  livro: number
  nome: Localized
  /** Normalised [x, y] waypoints. */
  pontos: [number, number][]
}

export interface Book {
  id: number
  pt: string
  en: string
}
