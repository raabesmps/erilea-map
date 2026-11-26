# Testes de navegador (regressão do mapa)

Camada R1/R3 de `docs/biomas/CONSOLIDACAO-TECNICA.md`: o mapa renderizado em resolução total precisa continuar **bit a bit igual** ao registrado.

> Para validar e publicar, use o portão do projeto (`npm run portao`, `npm run publicar`; ver `scripts/`): ele encerra o servidor, guarda os logs completos e impede o push depois de uma falha.

```bash
npm run test:navegador                                   # compara com mestre.json (precisa do Google Chrome instalado)
npm run golden:referencia                                # recupera os goldens de pixels A PARTIR DO COMMIT DE REFERÊNCIA (e34b710)
npm run mestre:atualizar -- --motivo "texto do porquê"   # atualização DELIBERADA dos valores mestre (registrada)
```

## O que é comparado

Por caso (semente, estilo, Terrasen): SHA-256 do buffer RGBA inteiro (2400 × 1680 × 4), hash amostral antigo, hash do plano de Terrasen e hash do texto do SVG.
Quando o SHA-256 muda, o teste compara pixel a pixel com o golden local e imprime o número de pixels diferentes, a caixa e as regiões, e grava `resultados/diff_*.png`.

## Referência original e como ela é protegida

- **A referência é o commit `e34b710`** (merge de Terrasen na `v1.0.0`). Os SHA-256 originais estão em `mestre.json`, na seção **`referencia`**, que **nunca é reescrita**.
- `mestre.json › casos` são os valores correntes. Eles só podem diferir de `referencia` se houver uma entrada em **`atualizacoes`** com motivo (≥ 10 caracteres), o commit do código, os casos alterados e os SHA-256 anteriores. Um teste de Vitest (`src/lib/proto/mestre.test.ts`) **falha** se isso não ocorrer.
- **Goldens (pixels) não são versionados** (≈ 117 MB), mas são **sempre recuperáveis**: `npm run golden:referencia` cria um *git worktree* temporário do commit de referência, serve **aquele** código, e grava um golden **somente se** o render reproduzir o SHA-256 mestre. Se não reproduzir, falha e **não grava**. O worktree é removido ao final. `golden/ORIGEM.json` registra o commit e os SHA-256.
- **Não existe comando que grave golden a partir do código em desenvolvimento.** Definir `GERAR_GOLDEN=1` à mão, sem o runner, falha com a mensagem "goldens só são gravados por `npm run golden:referencia`".
- Antes de usar um golden num relatório de pixels, o teste confere que o SHA-256 do golden é o valor mestre (um arquivo velho ou corrompido é rejeitado).

## Atualizar os valores mestre de propósito

Só depois de uma mudança visual **aprovada** (por exemplo, o merge de um bioma que altera o mapa):
1. confira que o diff é o esperado (`npm run test:navegador` mostra pixels e regiões);
2. `npm run mestre:atualizar -- --motivo "Adarlan aprovada em AAAA-MM-DD: altera pixels dentro de d<=1,6 das zonas r05"`;
3. revise `git diff tests/navegador/mestre.json`: devem aparecer os casos esperados em `casos` e uma entrada nova em `atualizacoes`;
4. se o golden também precisar mudar para uma nova referência aprovada, faça o commit dessa referência e rode `npm run golden:referencia <commit>`.

Sem `--motivo`, o runner recusa. A seção `referencia` continua sendo o original `e34b710`.

## Sementes

A 11 é a referência geográfica oficial. Nenhuma outra semente (1 a 400) passa nos validadores de geografia; **184, 21 e 37 são sementes de estresse**: não afirmam um mapa válido, só detectam código que dependa da semente 11.

## Ambiente

O SHA-256 depende do Chrome/GPU: na mesma máquina é estável (duas execuções seguidas dão o mesmo valor). Em outro ambiente o teste **falha**: a tolerância de `pixels.ts` serve **somente para diagnosticar** a diferença, nunca para aprovar nem para alterar valores mestre.
A página `pagina.html` é vazia de propósito: os testes importam os módulos de `/src` pelo servidor do Vite (porta 5191; 5192 para o worktree de referência).
