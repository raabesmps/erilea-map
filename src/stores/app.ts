import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import livros from '../data/livros.json'
import lugares from '../data/lugares.json'
import rotas from '../data/rotas.json'
import type { Book, Lang, Place, Route } from '../types'
import type { MapStyle } from '../lib/terreno'
import { GEO_PADRAO, type GeoId } from '../lib/geografia'
import type { NivelHidro } from '../lib/hidrografia'
import type { VariacaoTerrasen } from '../lib/proto/terrasen'
import { clampBook, visiblePlaces, visibleRoutes } from '../lib/spoiler'

export const BOOKS = livros as Book[]
export const MAX_BOOK = BOOKS.length - 1
const PLACES = lugares as Place[]
const ROUTES = rotas as Route[]

export const useAppStore = defineStore('app', () => {
  const book = ref(1)
  const lang = ref<Lang>('pt')
  const placeId = ref<string | null>(null)
  const style = ref<MapStyle>('colorido')
  /** Geography in use. Defaults to the approved shape; ?geo=1 or ?geo=2 preview the older ones. */
  const geo = ref<GeoId>(GEO_PADRAO)
  /** Hydrography tier drawn: 'alta' (default) or 'media' (?hidro=media preview). */
  const hidro = ref<NivelHidro>('alta')
  /** PROTOTYPE preview (?terrasen=A|B|C|AB). Off by default. */
  const terrasen = ref<VariacaoTerrasen | null>(null)
  /** EXPERIMENTAL: with ?terrasen, draw Terrasen symbols as an SVG layer (?vetor=0 keeps them in the raster). */
  const vetor = ref(true)
  /** Monotonic tokens so the map can react to one-shot requests. */
  const flyRequest = ref<{ id: string; n: number } | null>(null)
  const playRequest = ref<{ id: string; n: number } | null>(null)

  const places = computed(() => visiblePlaces(PLACES, book.value))
  const routes = computed(() => visibleRoutes(ROUTES, book.value))
  const currentPlace = computed(() => places.value.find((p) => p.id === placeId.value) ?? null)

  function setBook(value: unknown) {
    book.value = clampBook(value, MAX_BOOK)
    // a place that is no longer unlocked must not stay open
    if (placeId.value && !places.value.some((p) => p.id === placeId.value)) placeId.value = null
  }

  function setLang(value: Lang) {
    lang.value = value
    try {
      localStorage.setItem('erilea-lang', value)
    } catch {
      /* storage unavailable */
    }
  }

  function setStyle(value: MapStyle) {
    style.value = value
    try {
      localStorage.setItem('erilea-style', value)
    } catch {
      /* storage unavailable */
    }
  }

  function openPlace(id: string | null) {
    placeId.value = id && places.value.some((p) => p.id === id) ? id : null
  }

  function flyTo(id: string) {
    openPlace(id)
    flyRequest.value = { id, n: (flyRequest.value?.n ?? 0) + 1 }
  }

  function play(id: string) {
    playRequest.value = { id, n: (playRequest.value?.n ?? 0) + 1 }
  }

  return { book, lang, placeId, style, setStyle, geo, hidro, terrasen, vetor, places, routes, currentPlace, flyRequest, playRequest, setBook, setLang, openPlace, flyTo, play }
})
