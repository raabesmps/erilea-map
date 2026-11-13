<script setup lang="ts">
import L from 'leaflet'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'
import { MAP_H, MAP_W, renderTerrain, type MapStyle } from '../lib/terreno'
import { iconFor } from '../lib/icons'
import rotasData from '../data/rotas.json'
import type { Route } from '../types'

const store = useAppStore()
const { t } = useI18n()
const el = ref<HTMLDivElement>()
let map: L.Map
const pinLayer = L.layerGroup()
const routeLayer = L.layerGroup()
const animLayer = L.layerGroup()
let raf = 0
let overlay: L.ImageOverlay
const painting = ref(false)
const cache: Partial<Record<MapStyle, string>> = {}

function overlayUrl(style: MapStyle) {
  cache[style] ??= renderTerrain(MAP_W, MAP_H, 11, style).toDataURL('image/jpeg', 0.92)
  return cache[style]!
}

const toLL = (x: number, y: number) => L.latLng((1 - y) * MAP_H, x * MAP_W)
const allRoutes = rotasData as Route[]

// Lower number = label wins when two labels collide.
const PRIORITY: Record<string, number> = { cidade: 0, fortaleza: 1, porto: 2, mina: 3, floresta: 4, montanha: 5, saida: 6, regiao: -1, mar: 8 }
let markers: { m: L.Marker; id: string; tipo: string; livro: number }[] = []

const hit = (a: DOMRect, b: DOMRect, pad = 3) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad

/** Hide labels that would overlap a stronger label or any other pin. */
function declutter() {
  requestAnimationFrame(() => {
    const entries = markers.map((e) => ({ ...e, label: e.m.getTooltip()?.getElement() as HTMLElement | undefined, pin: e.m.getElement() as HTMLElement | undefined }))
    const pinRects = entries.map((e) => e.pin?.getBoundingClientRect())
    const order = entries
      .map((e, i) => ({ e, i }))
      .sort((a, b) => Number(b.e.id === store.placeId) - Number(a.e.id === store.placeId) || PRIORITY[a.e.tipo]! - PRIORITY[b.e.tipo]! || a.e.livro - b.e.livro)
    const taken: DOMRect[] = []
    for (const { e, i } of order) {
      if (!e.label) continue
      e.label.classList.remove('label-hidden')
      const r = e.label.getBoundingClientRect()
      const clash = taken.some((t) => hit(r, t)) || pinRects.some((p, j) => j !== i && p && hit(r, p, 1))
      if (clash && e.id !== store.placeId) e.label.classList.add('label-hidden')
      else taken.push(r)
    }
  })
}

function drawPins() {
  pinLayer.clearLayers()
  markers = []
  for (const p of store.places) {
    const classes = ['pin', p.icone ? p.icone : '', p.id === store.placeId ? 'active' : '', p.livro === store.book && p.livro > 0 ? 'new' : '']
    const icon = L.divIcon({
      className: '',
      html: `<div class="${classes.join(' ')}">${iconFor(p)}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })
    const m = L.marker(toLL(p.x, p.y), { icon, title: p.nome[store.lang], keyboard: true })
    m.bindTooltip(p.nome[store.lang], {
      permanent: true,
      direction: 'bottom',
      offset: [0, 16],
      className: `pin-label${['regiao', 'saida', 'mar'].includes(p.tipo) ? ' region-label' : ''}`,
    })
    m.on('click', () => store.openPlace(p.id === store.placeId ? null : p.id))
    pinLayer.addLayer(m)
    markers.push({ m, id: p.id, tipo: p.tipo, livro: p.livro })
  }
  declutter()
}

function drawRoutes() {
  routeLayer.clearLayers()
  for (const r of store.routes) {
    routeLayer.addLayer(
      L.polyline(r.pontos.map(([x, y]) => toLL(x, y)), {
        color: '#7a2e2b',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '4 11',
        lineCap: 'round',
        className: 'route-line',
        interactive: false,
      }),
    )
  }
}

function playRoute(id: string) {
  const route = allRoutes.find((r) => r.id === id)
  if (!route) return
  cancelAnimationFrame(raf)
  animLayer.clearLayers()
  const pts = route.pontos.map(([x, y]) => toLL(x, y))
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const len = pts[i]!.distanceTo(pts[i - 1]!)
    seg.push(len)
    total += len
  }
  const line = L.polyline([pts[0]!], { color: '#7a2e2b', weight: 5, opacity: 0.95, lineCap: 'round', interactive: false }).addTo(animLayer)
  const traveler = L.marker(pts[0]!, {
    icon: L.divIcon({ className: '', html: '<div class="traveler"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    interactive: false,
    zIndexOffset: 1000,
  }).addTo(animLayer)

  map.flyToBounds(L.latLngBounds(pts).pad(0.35), { duration: 0.9 })
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const duration = reduce ? 1 : Math.min(9000, 2500 + total * 3.2)
  const start = performance.now() + 900

  const frame = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / duration))
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    let dist = eased * total
    const path: L.LatLng[] = [pts[0]!]
    for (let i = 0; i < seg.length; i++) {
      const s = seg[i]!
      if (dist >= s) {
        path.push(pts[i + 1]!)
        dist -= s
      } else {
        const f = dist / s
        const a = pts[i]!
        const b = pts[i + 1]!
        path.push(L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f))
        break
      }
    }
    line.setLatLngs(path)
    traveler.setLatLng(path[path.length - 1]!)
    if (t < 1) raf = requestAnimationFrame(frame)
    else setTimeout(() => animLayer.clearLayers(), 2500)
  }
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  map = L.map(el.value!, {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 1.5,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    zoomControl: false,
    attributionControl: false,
    maxBoundsViscosity: 0.9,
  })
  const bounds = L.latLngBounds([0, 0], [MAP_H, MAP_W])
  map.setMaxBounds(bounds.pad(0.25))
  overlay = L.imageOverlay(overlayUrl(store.style), bounds).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  pinLayer.addTo(map)
  routeLayer.addTo(map)
  animLayer.addTo(map)
  // portrait screens: cover the height instead of letting the dark background show
  const size = map.getSize()
  const portrait = size.x / size.y < MAP_W / MAP_H
  const fit = map.getBoundsZoom(bounds, false)
  const zoom = portrait ? (fit + map.getBoundsZoom(bounds, true)) / 2 : fit
  if (portrait) map.setView(bounds.getCenter(), zoom, { animate: false })
  else map.fitBounds(bounds, { paddingTopLeft: [0, 96], paddingBottomRight: [0, 28], animate: false })
  map.setMinZoom(map.getZoom() - 0.5)
  map.on('click', () => store.openPlace(null))
  map.on('zoomend', declutter)
  drawPins()
  drawRoutes()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  map?.remove()
})

watch(() => [store.places, store.lang, store.placeId, store.book], drawPins)
watch(() => store.routes, drawRoutes)
watch(
  () => store.style,
  (st) => {
    painting.value = true
    // let the "painting" badge render before the (synchronous) repaint
    setTimeout(() => {
      overlay.setUrl(overlayUrl(st))
      painting.value = false
    }, 40)
  },
)
watch(
  () => store.flyRequest,
  (req) => {
    const p = store.places.find((x) => x.id === req?.id)
    if (p) map.flyTo(toLL(p.x, p.y), Math.max(map.getZoom(), 0), { duration: 1.1 })
  },
)
watch(
  () => store.playRequest,
  (req) => req && playRoute(req.id),
)
</script>

<template>
  <div class="wrap">
    <div ref="el" class="map" role="application" aria-label="Mapa de Erilea" />
    <div v-if="painting" class="surface painting" role="status">{{ t('painting') }}</div>
  </div>
</template>

<style scoped>
.wrap,
.map {
  position: absolute;
  inset: 0;
}
.painting {
  position: absolute;
  z-index: 1300;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 22px;
  font-family: var(--font-title);
  letter-spacing: 0.08em;
}
</style>
