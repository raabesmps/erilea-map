# Spike: camada vetorial de símbolos (descartável)

Não faz parte do app. Verifica se um `L.svgOverlay` com os mesmos limites do `L.imageOverlay` se mantém sincronizado
com o raster em zoom, pan e troca cor ↔ sépia.

Rodar: `npm run dev` e abrir `/spikes/vetorial/index.html`. `window.__spike` expõe mapa, overlays e as duas estratégias de troca.
Resultados e conclusões: seção 12 de `docs/biomas/terrasen/PLANO-TERRASEN.md`.

Observação: `trocarNaive` reaproveita os mesmos nós do SVG de cada modo, então, depois de chamá-la, o SVG "cor" passa a conter o desenho do sépia.
Recarregue a página antes de comparar visualmente.
