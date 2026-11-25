# Consolidação técnica antes do segundo bioma (Adarlan)

**Status:** análise e **proposta**. Nada aqui foi implementado. A branch `bioma-adarlan` parte da `v1.0.0` (commit `e34b710`) e só traz documentação.
O objetivo é decidir, **antes** de desenhar Adarlan, como o que foi construído para Terrasen vira uma base para vários biomas **sem mudar um pixel de Terrasen**.

Legenda: **[MEDIDO]** número obtido nesta análise · **[CÓDIGO]** lido no código · **[PROPOSTA]** decisão a revisar.

## 0. Resumo

| # | Tema | Achado principal | Proposta | Risco | Esforço |
|---|---|---|---|---|---|
| 1 | Planejador | Terrasen está em um arquivo de 759 linhas com ids de zona, limites de varredura (`0,5 W … 0,92 W`, `0 … 0,32 H`), dados de arte e desenhos fixos no código | módulo genérico `biomas/` com Terrasen como primeiro cliente; passos reutilizáveis (cumeeiras, núcleos, clareiras, bosques) e dados em JSON | médio, mitigado por testes "mestre" (golden) antes de mexer | 2 a 3 sessões |
| 2 | Envelhecimento | **três** definições da vinheta (sépia no raster, cor no raster, sépia no vetor) | um arquivo `envelhecimento.ts` com os parâmetros e funções; raster e vetor usam os mesmos | baixo | 0,5 sessão |
| 3 | Overlays SVG | um SVG por modo, com todos os símbolos refinados, aguenta o mapa inteiro nos números medidos | **um SVG por modo** com grupos `<g data-bioma>` e ordem de pintura global; orçamento de caminhos como teste | baixo a médio (celular não medido) | 1 sessão |
| 5 | Reuso | cerca de 70% de Terrasen é reaproveitável sem mudança de lógica | tabela da seção 4 | baixo | n/a |
| 6 | Regressão | só a costa, a hidrografia e as métricas de Terrasen são testadas hoje; não há prova automática de que **Terrasen não muda** quando outro bioma entra | 5 camadas de teste, com os **valores mestre de Terrasen já registrados** (seção 5) | baixo | 1 a 2 sessões |

**Regra de ouro proposta:** nenhuma etapa de consolidação é aceita se os valores mestre (hashes do plano, do SVG e do mapa padrão) mudarem. Consolidar é **refatorar**, não redesenhar.

---

## 1. Extração do planejador de biomas

### 1.1 Como Terrasen está montada hoje [CÓDIGO]

| Peça | Onde | Genérica? |
|---|---|---|
| Peso de zona suave (`criarPeso`), campo de bioma (`buildField`) | `proto/terrasen.ts`, `colorir.ts` | **sim** (recebem um predicado de zonas) |
| Paleta | `PALETA_TERRASEN`, `PALETA_ZONAS` (ids `r03-*` escritos no código) | não |
| Dados de arte (cumeeiras, núcleos, lavagem) | `terrasen-arte.json` importado como constante `ARTE` | dados sim, import fixo não |
| Planejador `planejarTerrasen` | `proto/terrasen.ts` | **não**: laços fixos `gy < 0,32 H`, `gx 0,5 W … 0,92 W`; `PINS` e `ROTAS` importados no módulo; passo das cumeeiras específico |
| Lavagens (clareira, massa) | `desenharWashes` | quase (cores fixas por modo) |
| Desenho dos símbolos | `conifera`, `montanha` (estilos A/B/C) | não: dois tipos fixos |
| Gancho no pintor colorido | `colorir.ts`: `PaintCtx.proto`, `aplicarPaleta(B.zonas)`, `planoProto`, `drawGlyphs` (mistura) | não: assume **um** bioma |
| Gancho no sépia | `terreno.ts`: `protoClassico`, lavagem, `omitir`, desenho dos glifos | não |
| Camada vetorial | `camada-vetorial.ts`, `MapaView.vue` (`criarCapa`, `mostrarModo`) | recebe **um** plano |
| Estado e URL | `store.terrasen`, `?terrasen=A\|B\|C\|AB`, `?vetor`, `?papel` | um bioma |
| Testes | `terrasen.test.ts`, `acabamento.test.ts` | acoplados a `ARTE` |

Achados extras:
- `PALETA_TERRASEN.bordaSul` (`#66875F`), descrita no plano como a transição com Adarlan, **está definida e nunca é usada**. A transição Terrasen → Adarlan nunca foi implementada; só existe a mistura natural de cores (seção 6 do plano de Adarlan).
- O planejador de Terrasen **não consome o gerador aleatório compartilhado** (usa hash próprio). Isso é a propriedade que permite somar biomas sem deslocar os outros. Deve ser regra para todos os biomas.
- No sépia, o planejador padrão (`terreno.ts`) é **independente das zonas** (ruído de cordilheira e de bosque em todo o mapa), enquanto o colorido (`colorir.ts`) é guiado pelas zonas. Os dois modos já discordam fora de Terrasen: em Adarlan, o sépia desenha **25 montanhas** e o colorido **nenhuma** [MEDIDO].

### 1.2 Arquitetura proposta [PROPOSTA]

```
src/lib/biomas/
  tipos.ts          BiomaRefinado, GlifoB, PlanoBioma, EntradaPlano, AjusteBioma
  registro.ts       BIOMAS_REFINADOS = [terrasen, adarlan, ...]  (ordem fixa)
  planejador/
    aceitador.ts    grade de ocupação compartilhada + "tentar" (terra, peso, ícones, rótulos, água, rotas, espaçamento)
    cumeeiras.ts    montanhas ao longo de polilinhas (hoje o passo 1 de Terrasen)
    nucleos.ts      campo de núcleos + dardos de ruído azul (passo 3)
    clareiras.ts    clareiras intencionais (passo 2)
    bosques.ts      bosques pequenos (passo 4)
    massas.ts       lavagens escuras por núcleo
  glifos/
    registro.ts     (tipo, estilo, modo) -> função de desenho (subconjunto do canvas aceito pelo GravadorSvg)
    conifera.ts, montanha.ts   (movidos de terrasen.ts, sem alterar o desenho)
  terrasen/
    index.ts        define o BiomaRefinado de Terrasen (zonas, paleta, passos, estilos A/B)
    terrasen-arte.json
```

Contrato (esboço, não é código final):

```ts
interface BiomaRefinado {
  id: string                                  // 'terrasen' | 'adarlan' | ...
  zonas: (zonaId: string) => boolean          // zonas de biomas.json que o bioma possui
  paleta: Record<string, { cor?: string; arv?: string; rocha?: string }>
  janela: [x0: number, y0: number, x1: number, y1: number]   // varredura, normalizada (substitui 0,5-0,92 e 0-0,32)
  arte: unknown                               // JSON do bioma (cumeeiras, núcleos, parâmetros)
  estilos: { cor: string; sepia: string }     // 'A' e 'B' em Terrasen
  planejar(e: EntradaBioma): PlanoBioma       // composição de passos genéricos + passos próprios
}
```

Regras de composição:
1. **Ordem fixa e independência.** Os biomas são planejados na ordem do registro. Terrasen vem **primeiro** e **não enxerga** os biomas seguintes; os seguintes enxergam os símbolos dos anteriores como obstáculos (grade de ocupação compartilhada). Assim, **registrar Adarlan não pode mudar o plano de Terrasen**, e as bordas não ganham símbolos sobrepostos.
2. **Sem aleatório compartilhado.** Todo passo usa o hash de posição (`h2`), nunca o `rnd` do mapa.
3. **Propriedade.** Cada zona de `biomas.json` pertence a no máximo um bioma refinado; a faixa de transição entre dois biomas é declarada nos dados (dono, largura, orçamento de ΔE).
4. **Tipos de símbolo abertos.** `GlifoB.tipo` deixa de ser a união `'conifera' | 'montanha' | 'colina'` e passa a ser uma chave do registro de glifos.
5. **Uma só entrada no pintor.** `PaintCtx.proto` e os ganchos do sépia viram `biomas?: BiomaAtivo[]`; `aplicarPaleta` aplica as paletas de todos os biomas ativos.

Estado e URL (compatível): `store.terrasen` vira `store.biomas: Set<string>` com o estilo por bioma. `?terrasen=AB` continua valendo (atalho para `biomas=terrasen`), e a demo liga `terrasen` por padrão como hoje; novos parâmetros: `?biomas=terrasen,adarlan`, `?adarlan=AB`.

### 1.3 Sequência de extração (cada etapa só passa se os valores mestre não mudarem)

1. **Congelar os valores mestre** (seção 5): testes novos, **antes** de qualquer refatoração.
2. Mover os desenhos (`conifera`, `montanha`) para `glifos/` sem alterar o código.
3. Extrair `aceitador.ts` (grade e `tentar`) e fazer `planejarTerrasen` usá-lo.
4. Extrair os passos (`cumeeiras`, `nucleos`, `clareiras`, `bosques`, `massas`) um por vez.
5. Introduzir `BiomaRefinado` + `registro.ts`; Terrasen vira o primeiro cliente; trocar os ganchos de `colorir.ts`, `terreno.ts`, `MapaView.vue` e `store`.
6. Remover o código morto (`bordaSul`, tipos antigos).

Custo de execução: o planejamento de Terrasen leva dezenas de milissegundos [MEDIDO: os testes completos, planejador incluído, rodam em ~1,5 s]; vários biomas não mudam a ordem de grandeza.

### 1.4 O que **não** muda

Geografia, costa, hidrografia, lugares, rotas, outras zonas, interface, o resultado visual de Terrasen (A em cor, B no sépia, `papel=1`), a demo e a `v1.0.0`.

---

## 2. Envelhecimento do pergaminho: duplicação e centralização

### 2.1 O que existe [CÓDIGO]

| Onde | Parâmetros | Observação |
|---|---|---|
| `terreno.ts` `drawAging` (raster sépia) | gradiente radial de `0,35 · min(W,H)` a `0,72 · max(W,H)`; de `(120,80,30,0)` a `(90,52,18,0,55)` | aplicado **depois** dos símbolos |
| `colorir.ts` `paintColorido` (raster cor) | `0,40 · min` a `0,72 · max`; até `alfa 0,38` | mesma cor, intensidade e raio inicial **diferentes** |
| `papel-sepia.ts` `vinheta()` (vetor sépia) | reimplementa **a do sépia** com os mesmos números | duplicata manual |
| `papel-sepia.ts` | `QUENTE`, `HALO_SEPIA`, `PARAMS_PAPEL` | específicos do vetor |
| grão | `terreno.ts` ±4,5 por pixel; `colorir.ts` ±4; vetor: máscara PNG de 192 px | três aproximações do "papel" |

Achado: **os símbolos vetoriais do colorido não recebem a vinheta do colorido** (o raster aplica por cima dos símbolos; o SVG fica acima). A diferença é pequena onde Terrasen está (≈ 5,6% de mistura em Orynth [MEDIDO por cálculo: distância 827 px; `t = 0,147`; `alfa = 0,056`]), mas cresce para as bordas (até 38% no canto). Para Adarlan, a borda leste (`x ≈ 0,86`) chega a ≈ 7%.

### 2.2 Proposta [PROPOSTA]

`src/lib/envelhecimento.ts`, **única fonte**:

```ts
export const VINHETA = {
  sepia: { r0: 0.35, r1: 0.72, de: [120,80,30], ate: [90,52,18], alfa: 0.55 },
  cor:   { r0: 0.40, r1: 0.72, de: [120,80,30], ate: [90,52,18], alfa: 0.38 },
} as const
export function vinhetaEm(x, y, W, H, p): { rgb, a }       // analítica (vetor e testes)
export function desenharVinheta(ctx, W, H, p): void        // canvas (raster), mesmos números
export const TOM_QUENTE, GRAO...                           // constantes do papel, hoje espalhadas
```

- `terreno.ts` e `colorir.ts` chamam `desenharVinheta`; `papel-sepia.ts` chama `vinhetaEm`. Sem literais repetidos.
- **Teste de equivalência (navegador):** desenhar `desenharVinheta` sobre um canvas branco e comparar com `vinhetaEm` em ≥ 200 pontos (diferença ≤ 1/255). Isso amarra raster e vetor, que hoje só têm um teste "analítico" isolado.
- **Neutralidade:** substituir os literais pelas constantes deve produzir o **mesmo mapa** (hash do mapa padrão e de Terrasen, seção 5).
- **Mudança opcional, que precisa de aprovação:** aplicar `VINHETA.cor` também aos símbolos vetoriais do colorido. Altera levemente (≤ 6% em Terrasen) o que você aprovou; por isso **não entra** na consolidação.

---

## 3. Arquitetura dos overlays SVG com vários biomas refinados

### 3.1 Estado atual [CÓDIGO]

Por modo (cor, sépia): um `L.imageOverlay` (raster sem os símbolos de Terrasen) e **um** `L.svgOverlay` de **mesmos limites** (mapa inteiro) com um `<g>` por símbolo. Painéis próprios (z 390 imagens, 395 símbolos) ficam abaixo das rotas (400) e dos marcadores (600). Os dois modos ficam decodificados e a troca inverte `visibility` dos quatro elementos num quadro. A máscara de grão usa `mask-size: 5%` da largura do elemento.

### 3.2 Opções para vários biomas

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A** | **um SVG por modo** com os símbolos de **todos** os biomas refinados, grupos `<g data-bioma>`, ordem de pintura global por `y` | ordem correta nas bordas entre biomas; mesma máscara e mesmo grão (sem emenda); número de camadas constante (2 por modo) | o SVG cresce com o mapa |
| B | um SVG por bioma por modo, com limites apertados | SVGs pequenos | emendas de grão (a máscara é em % do elemento), ordem de pintura entre biomas ambígua, mais elementos para alternar |
| C | camada de blocos (`GridLayer`) que re-rasteriza o SVG por bloco | escala para qualquer tamanho | perde a nitidez **durante** a animação de zoom; muito mais código |

### 3.3 Medição de escala (sintética) [MEDIDO]

Chrome desktop, 1280 × 760, mapa em zoom 0. Réplicas do conjunto de Terrasen espalhadas pelo mapa, no mesmo SVG, estilo A em cor. A coluna "zoom" é uma animação de −0,5 a 1,5.

| Símbolos | Caminhos | Tamanho | Montagem | Pan: média / p95 / máx. (quadros > 20 ms) | Zoom: p95 / máx. (quadros > 20 ms) |
|---|---|---|---|---|---|
| 151 (hoje) | 2.020 | 255 KB | n/d | 16,67 / 16,9 / 17,1 ms (0) | 22,9 / 226 ms (3) |
| 604 | 8.080 | 1,0 MB | 57 ms | 16,82 / 17,0 / 43,4 ms (1) | 29,9 / 108 ms (5) |
| 1.208 | 16.160 | 2,0 MB | 43 ms | 16,67 / 17,5 / 18,1 ms (0) | 18,0 / 103 ms (3) |
| 1.812 | 24.240 | 3,0 MB | 85 ms | 16,67 / 17,2 / 18,1 ms (0) | 28,5 / 253 ms (5) |

Leitura honesta:
- **O pan não degrada** com até 24 mil caminhos.
- No zoom há quadros longos isolados (100 a 250 ms) **inclusive na linha de base de 151 símbolos (226 ms)**; não crescem com o tamanho, ou seja, são custo de primeira rasterização, não de escala.
- O mapa inteiro, se todos os símbolos virassem vetor, teria da ordem de 1.500 a 2.000 símbolos **[ESTIMATIVA, a medir]** (grade de 22 px, ~25% de ocupação), dentro da faixa medida.
- **Limites desta medição:** só Chrome desktop; símbolos sintéticos replicados (sem a variedade de formas de Adarlan); **celular não medido**; memória de rasterização do navegador não medida.

### 3.4 Recomendação [PROPOSTA]

**Opção A.** Um SVG por modo, com `<g data-bioma="terrasen">`, `<g data-bioma="adarlan">` etc.:
- ordem de pintura global (os planos de todos os biomas são concatenados e ordenados por `y`);
- máscara de grão e vinheta idênticas em toda a camada (sem emendas);
- `MapaView.vue`: `criarCapa(style)` passa a receber a lista de biomas ativos; o resto (painéis, pré-carga, troca por `visibility`) não muda;
- o raster, no modo vetorial, deixa de desenhar os símbolos de **todos** os biomas refinados (generalização do `vetorial` atual).

**Orçamento verificável (teste):** ≤ 30 mil caminhos e ≤ 4 MB de SVG por modo; se for ultrapassado, reavaliar a opção B ou C. **Condição para a decisão ficar firme:** medir a camada real (Terrasen + Adarlan) em celular (emulação com limitação de CPU e um aparelho real).

### 3.5 Pontos de atenção

- **Primeira troca de modo (≈ 2,2 s)** continua sendo o gargalo percebido; com mais biomas o planejamento soma pouco, mas o raster do outro modo ainda é síncrono. Proposta futura: renderizar o outro modo em ociosidade.
- **Dois planejadores no sépia** (um por zona para os biomas refinados, outro por ruído para o resto): ao refinar Adarlan, o sépia precisa **consultar o peso de Adarlan** (como já faz com Terrasen) para parar de desenhar montanhas ali.
- `mask-image` sem teste em Safari e Firefox (pendência já registrada).

---

## 4. O que de Terrasen se reaproveita em Adarlan (item 5)

| Componente | Reuso | O que muda para Adarlan |
|---|---|---|
| `criarPeso`, `buildField`, zonas como predicado | **direto** | predicado `r05-*` |
| Aceitador (terra, peso, ícones + rótulos, água, rotas, espaçamento) | **direto** | margens do bioma (planície aceita mais vazio) |
| Dardos de ruído azul com raio variável | **direto** | núcleos viram **bosques** e **corredores de rio**, não florestas de coníferas |
| Hash determinístico sem `rnd` | **direto** | regra do projeto |
| `GravadorSvg`, `construirSvgTerrasen`, `MapaView` com pré-carga | **direto** (generalizar para N biomas) | símbolos novos precisam usar só o subconjunto do canvas aceito |
| Integração sépia (`papel-sepia`) | **direto** | `papel=1` aprovado |
| Lavagens (massa escura, clareira clara) | adaptar | tons próprios; "clareira" vira **campo aberto** |
| Métricas (Clark-Evans, VMR, quase-colinearidade com modelo nulo, vazios) | **direto**, mas **critérios novos** | em campo aberto o "vazio" é intencional; a regularidade (grade de 22 px) é o defeito |
| Medição de alcance de cor (`diff-extent`) | **direto** | a zona de Adarlan toca Terrasen, Carvalhal, Melisande e Eyllwe |
| Ferramentas de comparação e de GIF | **direto** | n/a |
| **Cumeeiras** (polilinha de montanhas) | **não** | Adarlan não tem montanhas; o equivalente é uma **cadeia de colinas** suaves, opcional |
| **Núcleos florestais** de Terrasen | parcial | só como motor de aglomeração; as espécies e as formas mudam |
| **Coníferas** A/B/C e **montanhas** A/B/C | **não** | novos símbolos: folhosa (carvalho) A/B, bosque, colina em ondulação, junco |
| **Neve** | **não** | n/a |
| **Chão em raster** (textura dos campos) | **própria** | a identidade de Adarlan está mais no **chão** (mosaico de campos, tons) do que nos símbolos; essa parte fica no raster, não no SVG |

Resumo: a **maquinaria** (planejar, aceitar, gravar em SVG, integrar ao papel, medir) é reaproveitável; a **linguagem visual** (coníferas, neve, cumeeiras) não.

---

## 5. Testes de regressão (item 6)

### 5.1 Valores mestre de Terrasen, registrados **agora** [MEDIDO, v1.0.0 em `e34b710`]

Arquivo: [`baselines-terrasen.json`](baselines-terrasen.json). Resumo (Chrome, 2400 × 1680, semente 11, geo v3, hidro alta):

| Item | colorido | sépia |
|---|---|---|
| Mapa padrão (sem biomas), impressão digital | `a52c1545` | `9377232a` |
| Terrasen `AB`, símbolos planejados | 151, hash do plano `8a7cb845` | 151, `8a7cb845` (o mesmo plano) |
| Terrasen `AB`, raster com símbolos | `7ee8a352` | `2928f70e` |
| Terrasen `AB`, raster em modo vetorial (sem símbolos) | `97b94061` | `92b1c104` |
| SVG de Terrasen (`papel=1`), hash do texto | `77624929` | `16ab64e4` |

Observações: o hash do mapa padrão coincide com o da `v1.0.0` pré-Terrasen (verificado na rodada 4). Hashes de **plano e de SVG** são texto determinístico (igualdade estrita). Hashes de **pixels** dependem do navegador/GPU: usar igualdade estrita só na mesma máquina e um teste com tolerância (≤ 1/255 por canal, ≤ 0,01% dos pixels) em outras.

### 5.2 Camadas propostas

| Camada | Garante | Como | Roda |
|---|---|---|---|
| **R1 · Mestre de Terrasen** | Terrasen não muda | hash do plano e do texto do SVG iguais aos de 5.1 (Vitest, sem navegador); hash dos pixels no teste de navegador | sempre |
| **R2 · Independência de ordem** | registrar Adarlan **não altera** o plano de Terrasen e vice-versa na faixa de transição declarada | planejar Terrasen sozinha e com Adarlan registrada; comparar listas de símbolos (iguais); depois, Adarlan vê Terrasen como obstáculo | sempre |
| **R3 · Mapa padrão** | sem biomas ativos, o mapa é o da `v1.0.0` | hash cor/sépia = `a52c1545` / `9377232a` | sempre (navegador) |
| **R4 · Alcance dos pixels** | Adarlan só altera pixels dentro de `d ≤ 1,6` das suas zonas; **nenhum** pixel muda no interior de Terrasen (`d ≤ 1`) | mesma medição do `diff-extent`, comparando "Adarlan ligada" × "desligada", com a faixa de transição declarada como exceção | por mudança de bioma |
| **R5 · Dados protegidos** | costa, hidrografia, lugares, rotas, outros biomas | testes que já existem (impressão digital da costa `9e05e5c1`, rios, hidrografia) + `git diff` nos arquivos protegidos como verificação de CI | sempre |
| **R6 · Propriedades por bioma** (para todo bioma registrado) | símbolos em terra, dentro do bioma, a ≥ 14 px da água, ≥ 13 px das rotas, fora do ícone + rótulo; determinismo; sem sobreposição entre biomas; dono único por zona | testes de propriedade que percorrem o `registro` (um conjunto, N biomas) | sempre |
| **R7 · Métricas de aceitação** | critérios de cada plano (ΔE, contraste, regularidade, aglomeração, vazios, contagens) | `*.test.ts` por bioma, como `terrasen.test.ts` | sempre |
| **R8 · Vetor × raster** | sem duplicação (0 pixels fora das caixas), alinhamento 0 px, troca cor ↔ sépia sem quadro incoerente, ordem das camadas, interação (zoom, busca, marcadores, rotas) | script de navegador (Playwright) com os critérios das rodadas 3 e 4 | por mudança de camada/bioma |
| **R9 · Envelhecimento** | raster e vetor iguais (seção 2) | equivalência `desenharVinheta` × `vinhetaEm` | sempre (navegador) |
| **R10 · Orçamento** | tempo de renderização ≤ +10%; caminhos ≤ 30 mil/modo; SVG ≤ 4 MB/modo; carga inicial | medição repetida (2 execuções) com a mesma ferramenta de hoje | por mudança de bioma |

Infraestrutura necessária: hoje o repositório **não** tem Playwright como dependência (os scripts usam a cópia do projeto `mes-certo`). Proposta: um diretório `tests/navegador/` com `@playwright/test` como `devDependency` e um script `npm run test:navegador`. As camadas R1, R2, R5, R6, R7 rodam em Vitest puro, sem navegador.

---

## 6. Ordem de execução proposta

1. **Consolidação (sem mudar resultado):**
   - 0a. Testes mestre R1/R3 e infraestrutura de navegador (R8, R9).
   - 0b. `envelhecimento.ts` (seção 2).
   - 0c. Módulo `biomas/` com Terrasen como cliente (seção 1).
   - 0d. `MapaView` para vários biomas (seção 3), com orçamento (R10).
   - **Portão:** todos os valores mestre iguais; `git diff` mostra mudança só nos arquivos esperados.
2. **Adarlan, protótipo desligado por padrão** (`?adarlan=`), conforme o [plano de Adarlan](adarlan/PLANO-ADARLAN.md).
3. Comparações, refinamento visual, aprovação e merge, como em Terrasen.
4. Atualizar a demo (`demo/terrasen`) com Adarlan quando aprovada.

Nada disto começa sem a sua revisão e aprovação.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Refatoração muda Terrasen sem perceber | valores mestre antes; portão por etapa; commits pequenos |
| Hash de pixels varia entre máquinas | igualdade estrita só em plano/SVG; tolerância nos pixels |
| SVG cresce além do que o celular aguenta | orçamento como teste; medição em celular antes de decidir a opção A definitiva |
| Adarlan pede símbolos que o gravador SVG não suporta | usar só o subconjunto aceito; teste que percorre todos os símbolos (já existe para Terrasen) |
| A transição Terrasen → Adarlan fica com "faixa rala" ou salto de espécie | faixa declarada nos dados, com dono, largura e orçamento de ΔE (ver o plano de Adarlan) |
| Sépia continua desenhando montanhas em Adarlan | o sépia passa a consultar o peso de Adarlan (como faz com Terrasen) |
