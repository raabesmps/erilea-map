# Testes de navegador (regressão do mapa)

Camada R1/R3 de `docs/biomas/CONSOLIDACAO-TECNICA.md`: o mapa renderizado em resolução total precisa continuar **bit a bit igual** ao registrado.

```bash
npm run test:navegador   # compara com tests/navegador/mestre.json (precisa do Google Chrome instalado)
npm run golden:gerar     # grava os goldens de pixels (locais, ignorados pelo git) a partir do código ATUAL
npm run mestre:gerar     # reescreve mestre.json a partir do código ATUAL: só depois de uma mudança APROVADA
```

O que é comparado, por caso (semente, estilo, Terrasen): SHA-256 do buffer RGBA inteiro, hash amostral antigo, hash do plano de Terrasen e hash do texto do SVG.
Quando o SHA-256 muda, o teste compara pixel a pixel com o golden local e imprime o número de pixels diferentes, a caixa e as regiões, e grava `resultados/diff_*.png`.

**Fluxo recomendado antes de uma refatoração:** no commit de referência, rode `npm run golden:gerar` (leva ~2 min, ≈ 117 MB). Depois de cada etapa, rode `npm run test:navegador`. Se falhar, **pare e investigue**: o relatório de pixels mostra onde.

**Sementes.** A 11 é a referência aprovada. Nenhuma outra semente (1 a 400) passa nos validadores de geografia; 184, 21 e 37 são **sementes de estresse** (não afirmam um mapa válido).

**Ambiente.** O SHA-256 depende do Chrome/GPU: na mesma máquina é estável (duas execuções seguidas dão o mesmo valor). Em outro ambiente, compare com tolerância usando `pixels.ts`.

A página `pagina.html` é vazia de propósito: os testes importam os módulos de `/src` pelo servidor do Vite (porta 5191).
