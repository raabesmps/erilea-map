# Publicar a demonstração na Vercel

Branch: **`demo/terrasen`** (partiu da `v1.0.0` depois do merge `e34b710`). A `v1.0.0` não foi alterada. Esta branch só acrescenta a configuração de demonstração; o desenvolvimento dos outros biomas continua na `v1.0.0`.

## O que a demo faz de diferente

| | Build normal (`npm run build`, `npm run dev`) | Build de demonstração (`npm run build:demo`, `npm run dev:demo`) |
|---|---|---|
| Terrasen | desligada, só com `?terrasen=A\|B\|C\|AB` | **ligada por padrão**: estilo A em cor e B no sépia, com `papel=1` (versão B aprovada) |
| Rodapé | igual ao da `v1.0.0` | uma linha a mais: "Versão de demonstração: só Terrasen está refinada." (PT/EN) |
| Resto do mapa | idêntico | idêntico (geografia, hidrografia, lugares, rotas, outros biomas, interface) |

O comportamento da demo vem de uma variável de build, `VITE_DEMO=1`, lida do arquivo `.env.demo` quando o Vite roda com `--mode demo`. **Nenhum parâmetro de URL é necessário.**
Parâmetros de comparação que continuam valendo (também na demo): `?terrasen=off` (mapa original), `?terrasen=A|B|C|AB`, `&vetor=0` (símbolos no raster), `&papel=0|1|2`, `&estilo=classico`, `&geo=`, `&hidro=`.
A URL só carrega `terrasen` quando difere do padrão do build.

## Publicar (dashboard da Vercel)

1. *Add New… → Project* e importe o repositório `raabesmps/erilea-map`.
2. **Production Branch:** `demo/terrasen` (Settings → Git). A `v1.0.0` não deve ser a de produção desta demo.
3. O `vercel.json` já define tudo: `framework: vite`, `installCommand: npm ci`, `buildCommand: npm run build:demo`, `outputDirectory: dist`, **fallback de SPA** (todas as rotas servem `/index.html`; o estado fica na query) e cache imutável para `/assets/*`. Não é preciso configurar nada no painel.
4. Não há variáveis de ambiente a cadastrar (`VITE_DEMO` já vem do `.env.demo` versionado, que não contém segredo).
5. *Deploy*. Para um teste sem tocar na produção, use o preview de qualquer branch/PR, ou a CLI:

```bash
npx vercel            # preview
npx vercel --prod     # produção (só quando for publicar)
```

Domínio próprio: *Settings → Domains*.

## Testar o build de produção localmente

```bash
npm run build:demo
npm run preview:demo      # http://localhost:4173 (o preview serve o dist gerado)
```

Abra `/?livro=7&lang=pt` (cor) e `/?livro=7&lang=pt&estilo=classico` (sépia): Terrasen aparece sem `?terrasen=`.

## O que vai para o público (auditoria)

- `dist/` tem **3 arquivos**: `index.html`, um `.css` e um `.js` (~384 KB, 134 KB comprimido). Não há imagens, fontes locais nem dados do livro.
- O terreno é **gerado por código**; a costa não é decalque do mapa impresso. O mapa impresso e as folhas de comparação ficam em `referencia-local/`, que está no `.gitignore` e **fora do build** (busca por "referencia-local" no JS publicado: 0 ocorrências).
- Fontes: Cinzel e IM Fell English vêm do **Google Fonts** (licença SIL OFL, livre para uso público). A página faz requisição a `fonts.googleapis.com` e `fonts.gstatic.com`; se isso for um problema de privacidade/LGPD, o caminho é hospedar as fontes localmente.
- Dependências: Leaflet (BSD-2), Vue, Pinia, vue-router, vue-i18n, simplex-noise (MIT). Ícones e textos são do projeto.
- Direitos: *Throne of Glass* e Erilea pertencem a Sarah J. Maas e aos seus editores. O aviso de projeto de fã está no rodapé e no README; textos das notas são originais, sem trechos dos livros. Nomes e posições seguem a edição brasileira como leitura pessoal.
- Indexação: nada impede os buscadores. Se não quiser que a demo apareça em buscas, acrescente `<meta name="robots" content="noindex">` (ou o cabeçalho `X-Robots-Tag`) antes de divulgar.

## Atualizar a demo

Corpos de trabalho dos outros biomas continuam na `v1.0.0`. Para levar uma novidade aprovada à demo: `git checkout demo/terrasen && git merge v1.0.0`. Se a demo um dia virar a versão principal, basta remover o `.env.demo` ou trocar `TERRASEN_PADRAO` em `src/lib/demo.ts`.

## Pendências técnicas (herdadas de Terrasen, veja `docs/biomas/terrasen/PLANO-TERRASEN.md` §21)

1. A fórmula do envelhecimento está duplicada (`papel-sepia.ts` e `drawAging`).
2. `mask-image` não foi testado em Safari e Firefox reais (degrada para símbolos sem grão).
3. A primeira troca cor ↔ sépia leva cerca de 2,2 s; a carga inicial leva cerca de 3 s em desktop e 4 s em um celular emulado (o terreno é desenhado no navegador).
