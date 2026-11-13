<script setup lang="ts">
import L from 'leaflet'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { MAP_H, MAP_W, renderTerrain } from '../lib/terreno'
import { ICONS } from '../lib/icons'
import rotasData from '../data/rotas.json'
import type { Route } from '../types'

const store = useAppStore()
const el = ref<HTMLDivElement>()
let map: L.Map
const pinLayer = L.layerGroup()
const routeLayer = L.layerGroup()
const animLayer = L.layerGroup()
let raf = 0

const toLL = (x: number, y: number) => L.latLng((1 - y) * MAP_H, x * MAP_W)
const allRoutes = rotasData as Route[]

function drawPins() {
  pinLayer.clearLayers()
  for (const p of store.places) {
    const classes = ['pin', p.id === store.placeId ? 'active' : '', p.livro === store.book && p.livro > 0 ? 'new' : '']
    const icon = L.divIcon({
      className: '',
      html: `<div class="${classes.join(' ')}">${ICONS[p.tipo]}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })
    const m = L.marker(toLL(p.x, p.y), { icon, title: p.nome[store.lang], keyboard: true })
    m.bindTooltip(p.nome[store.lang], {
      permanent: true,
      direction: 'bottom',
      offset: [0, 16],
      className: `pin-label${p.tipo === 'regiao' ? ' region-label' : ''}`,
    })
    m.on('click', () => store.openPlace(p.id === store.placeId ? null : p.id))
    pinLayer.addLayer(m)
  }
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
  const canvas = renderTerrain()
  L.imageOverlay(canvas.toDataURL('image/jpeg', 0.92), bounds).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  pinLayer.addTo(map)
  routeLayer.addTo(map)
  animLayer.addTo(map)
  map.fitBounds(bounds)
  map.setMinZoom(map.getZoom() - 0.5)
  map.on('click', () => store.openPlace(null))
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
  <div ref="el" class="map" role="application" aria-label="Mapa de Erilea" />
</template>

<style scoped>
.map {
  position: absolute;
  inset: 0;
}
</style>
