# Spike: camada vetorial de símbolos (descartável)

> **Obsoleto desde a etapa 0c.** O código do app mudou (registro de glifos, `src/lib/biomas/`); este spike importa funções que não existem mais (`desenharGlifoT`) e não compila nem roda. Fica só como registro histórico das medições da rodada 2; a camada vetorial real está em `src/lib/biomas/camada-vetorial.ts`.

Não faz parte do app. Verifica se um `L.svgOverlay` com os mesmos limites do `L.imageOverlay` se mantém sincronizado
com o raster em zoom, pan e troca cor ↔ sépia.

Rodar: `npm run dev` e abrir `/spikes/vetorial/index.html`. `window.__spike` expõe mapa, overlays e as duas estratégias de troca.
Resultados e conclusões: seção 12 de `docs/biomas/terrasen/PLANO-TERRASEN.md`.

Observação: `trocarNaive` reaproveita os mesmos nós do SVG de cada modo, então, depois de chamá-la, o SVG "cor" passa a conter o desenho do sépia.
Recarregue a página antes de comparar visualmente.
