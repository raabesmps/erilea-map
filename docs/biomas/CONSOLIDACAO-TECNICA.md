# Consolidação técnica antes do segundo bioma (Adarlan)

**Status:** a consolidação foi **aprovada com ressalvas** (revisão de 2026-11-25). **Etapas 0a, 0b e 0c aprovadas** (a 0c com ressalva de processo). A **0c.5** (correção do processo de validação e publicação, seção 10.7) é pré-requisito da **0d**, que foi autorizada só depois dela. A branch `bioma-adarlan` parte da `v1.0.0` (commit `e34b710`).
O objetivo é decidir, **antes** de desenhar Adarlan, como o que foi construído para Terrasen vira uma base para vários biomas **sem mudar um pixel de Terrasen**.

Legenda: **[MEDIDO]** número obtido nesta análise · **[CÓDIGO]** lido no código · **[PROPOSTA]** decisão a revisar.

## Decisões da revisão (2026-11-25) e como foram incorporadas

| # | Decisão | Onde |
|---|---|---|
| 1 | Planejador genérico com Terrasen como primeiro cliente, ordem determinística, sem aleatório compartilhado. **Evitar abstrações sem necessidade concreta** | seção 1.2: só se extrai o que Adarlan usa agora |
| 2 | Centralizar o envelhecimento **preservando exatamente os parâmetros de cada modo**; **não** aplicar a vinheta aos símbolos vetoriais coloridos nesta etapa | seção 2.2 |
| 3 | Um SVG por modo, provisório; **cada símbolo** leva `data-bioma`, e a ordem de pintura é global por `y` (símbolos de biomas diferentes se intercalam) | seção 3.4 |
| 4 | Dez camadas de regressão e infraestrutura própria de Playwright; corrigido o "cinco camadas" do resumo | seções 0 e 5 |
| 5 | Hashes **integrais** dos buffers, comparação pixel a pixel, hashes determinísticos de plano e SVG preservados, outras sementes (a semente 11 continua a referência) | seção 5 e etapa 0a |
| 6 | **`bordaSul` fica** até a estratégia de transição ser decidida; nenhuma mudança visual em Terrasen | seção 1.3 |
| 7 | Orçamento de 30 mil caminhos e 4 MB **provisório**; investigar os picos de zoom **sem assumir a causa** (zoom frio/quente, os dois modos, celular quando houver camada real) | seções 3.4 e 3.5 |
| 8 | Etapas pequenas, commits separados, **portão** de regressão entre elas; **se um valor mestre mudar, interromper e apresentar o diagnóstico** | seção 6 |

## 0. Resumo

| # | Tema | Achado principal | Proposta | Risco | Esforço |
|---|---|---|---|---|---|
| 1 | Planejador | Terrasen está em um arquivo de 759 linhas com ids de zona, limites de varredura (`0,5 W … 0,92 W`, `0 … 0,32 H`), dados de arte e desenhos fixos no código | módulo genérico `biomas/` com Terrasen como primeiro cliente; passos reutilizáveis (cumeeiras, núcleos, clareiras, bosques) e dados em JSON | médio, mitigado por testes "mestre" (golden) antes de mexer | 2 a 3 sessões |
| 2 | Envelhecimento | **três** definições da vinheta (sépia no raster, cor no raster, sépia no vetor) | um arquivo `envelhecimento.ts` com os parâmetros e funções; raster e vetor usam os mesmos | baixo | 0,5 sessão |
| 3 | Overlays SVG | um SVG por modo, com todos os símbolos refinados, aguenta o mapa inteiro nos números medidos | **um SVG por modo**; cada símbolo leva `data-bioma` e a ordem de pintura é global por `y`; orçamento de caminhos provisório | baixo a médio (celular não medido) | 1 sessão |
| 5 | Reuso | cerca de 70% de Terrasen é reaproveitável sem mudança de lógica | tabela da seção 4 | baixo | n/a |
| 6 | Regressão | só a costa, a hidrografia e as métricas de Terrasen eram testadas; não havia prova automática de que **Terrasen não muda** | **10 camadas** de teste; os valores mestre (SHA-256 integral, plano, SVG) e o comparador de pixels **já existem (etapa 0a)** | baixo | 1 a 2 sessões |

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
- `PALETA_TERRASEN.bordaSul` (`#66875F`), descrita no plano como a transição com Adarlan, **está definida e nunca é usada**. A transição Terrasen → Adarlan nunca foi implementada; só existe a mistura natural de cores (seção 6 do plano de Adarlan). **Decisão: a constante fica.**
- O planejador de Terrasen **não consome o gerador aleatório compartilhado** (usa hash próprio). Isso é a propriedade que permite somar biomas sem deslocar os outros. Deve ser regra para todos os biomas.
- No sépia, o planejador padrão (`terreno.ts`) é **independente das zonas** (ruído de cordilheira e de bosque em todo o mapa), enquanto o colorido (`colorir.ts`) é guiado pelas zonas. Os dois modos já discordam fora de Terrasen: em Adarlan, o sépia desenha **25 montanhas** e o colorido **nenhuma** [MEDIDO].

### 1.2 Arquitetura proposta [PROPOSTA]

**Princípio (revisão):** só se extrai o que Adarlan **precisa agora**. O que for específico de Terrasen e ainda sem segundo cliente (cumeeiras, clareiras, massas) **fica em `terrasen/`** até Adarlan pedir algo parecido. Assim o módulo cresce por necessidade, não por especulação.

| Peça | Extrair agora? | Necessidade concreta |
|---|---|---|
| Aceitador (grade de ocupação + `tentar`) | **sim** | Adarlan precisa de terra, peso, ícones, rótulos, água, rotas e espaçamento, e precisa enxergar os símbolos de Terrasen |
| Registro de glifos (tipo, estilo, modo) | **sim** | Adarlan tem tipos novos (folhosa, colina em ondulação, junco) |
| `BiomaRefinado` + registro com ordem fixa | **sim** | dois biomas já são dois clientes |
| Dardos de ruído azul + núcleo | **sim, como função de baixo nível** | bosques de Adarlan usam a mesma amostragem |
| Cumeeiras | **não** (fica em `terrasen/`) | Adarlan não tem montanhas |
| Clareiras, bosques, massas | **não por enquanto** | só se Adarlan pedir comportamento igual |

A árvore abaixo mostra o **destino possível**, não o que será criado de uma vez:


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

### 1.3 Sequência de extração (revisada: **só o que Adarlan precisa**; cada subetapa só passa se os valores mestre não mudarem; ver as seções 6 e 10)

1. **Valores mestre congelados** (seção 5, etapa 0a, feita), antes de qualquer refatoração.
2. **0c.1:** extrair os desenhos existentes (`conifera`, `montanha`) para um módulo próprio e introduzir o **registro de glifos**, sem mudar as operações de desenho, os estilos nem a serialização SVG.
3. **0c.2:** extrair o **aceitador**, a **grade de ocupação** e as funções de **amostragem de baixo nível** que Adarlan usa (`h2`, suavização, `criarPeso`, ordenação de candidatos por prioridade), preservando a ordem das verificações, os limites, os espaçamentos e o determinismo.
4. **0c.3:** introduzir o contrato `BiomaRefinado` e o **registro de biomas com ordem fixa**; Terrasen é o primeiro e **único** bioma real registrado.
5. **0c.4:** ligar o planejador genérico aos **pintores raster**, no escopo mínimo. Generalizar as camadas SVG e o `MapaView` fica para a **0d**.
6. **Fica específico de Terrasen, de propósito, até haver um segundo cliente:** cumeeiras, clareiras, massas, núcleos florestais (`nucleoValor`), as lavagens, os dados `terrasen-arte.json`, a paleta e os ajustes de Terrasen, o filtro de símbolos padrão por peso de Terrasen.
7. **`bordaSul` permanece** (decisão da revisão) até a estratégia definitiva de transição Terrasen → Adarlan. Só se removem tipos que ficarem sem uso.

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

### 2.2 Proposta [PROPOSTA; executada na etapa 0b, ver seção 9]

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
- **Teste de equivalência (navegador):** desenhar `desenharVinheta` sobre um canvas branco e comparar com `vinhetaEm` em 1.120 pontos por caso, com tolerância de **2/255** (valor fixado pela medição da etapa 0b: diferença máxima observada 1,54/255, atribuída a arredondamento de 8 bits; seção 9). Isso amarra raster e vetor, que antes só tinham um teste "analítico" isolado.
- **Neutralidade:** substituir os literais pelas constantes deve produzir o **mesmo mapa** (hash do mapa padrão e de Terrasen, seção 5).
- **Decisão da revisão:** os parâmetros atuais de **cada modo** são preservados exatamente (`sepia` e `cor` ficam como estão) e a vinheta **não** é aplicada aos símbolos vetoriais coloridos nesta etapa. Aplicá-la alteraria levemente (≤ 6% em Terrasen) o que foi aprovado e só poderá ser proposto depois, com comparação visual.

---

## 3. Arquitetura dos overlays SVG com vários biomas refinados

### 3.1 Estado atual [CÓDIGO]

Por modo (cor, sépia): um `L.imageOverlay` (raster sem os símbolos de Terrasen) e **um** `L.svgOverlay` de **mesmos limites** (mapa inteiro) com um `<g>` por símbolo. Painéis próprios (z 390 imagens, 395 símbolos) ficam abaixo das rotas (400) e dos marcadores (600). Os dois modos ficam decodificados e a troca inverte `visibility` dos quatro elementos num quadro. A máscara de grão usa `mask-size: 5%` da largura do elemento.

### 3.2 Opções para vários biomas

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A** | **um SVG por modo** com os símbolos de **todos** os biomas refinados; cada símbolo leva `data-bioma`; ordem de pintura global por `y` (símbolos de biomas diferentes se intercalam) | ordem correta nas bordas entre biomas; mesma máscara e mesmo grão (sem emenda); número de camadas constante (2 por modo) | o SVG cresce com o mapa |
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
- No zoom há quadros longos isolados (100 a 250 ms) **inclusive na linha de base de 151 símbolos (226 ms)** e sem crescimento evidente com o tamanho do SVG nesta amostra. **A causa não é conhecida.** "Primeira rasterização" é só uma das hipóteses (outras: decodificação da imagem de 2400 px, rasterização do Leaflet, coleta de lixo, compositor, o próprio método de amostragem); o método para investigá-la está na seção 3.5. Esta medição **não** permite concluir que o custo seja ou não de escala.
- O mapa inteiro, se todos os símbolos virassem vetor, teria da ordem de 1.500 a 2.000 símbolos **[ESTIMATIVA, a medir]** (grade de 22 px, ~25% de ocupação), dentro da faixa medida.
- **Limites desta medição:** só Chrome desktop; símbolos sintéticos replicados (sem a variedade de formas de Adarlan); **celular não medido**; memória de rasterização do navegador não medida.

### 3.4 Recomendação [PROPOSTA, provisória]

**Opção A.** Um SVG por modo. **Cada símbolo** é um `<g data-i data-bioma="terrasen">` (ou `adarlan`, etc.), em vez de grupos por bioma:
- ordem de pintura **global por `y`**: os planos de todos os biomas são concatenados e ordenados juntos, e **símbolos de biomas diferentes se intercalam** (um grupo por bioma impediria isso: o grupo inteiro seria pintado antes ou depois do outro). O atributo `data-bioma` serve para diagnóstico, para testes (contar por bioma) e para ligar ou desligar biomas;
- máscara de grão e vinheta idênticas em toda a camada (sem emendas);
- `MapaView.vue`: `criarCapa(style)` passa a receber a lista de biomas ativos; o resto (painéis, pré-carga, troca por `visibility`) não muda;
- o raster, no modo vetorial, deixa de desenhar os símbolos de **todos** os biomas refinados (generalização do `vetorial` atual).

**Orçamento verificável (teste), PROVISÓRIO:** ≤ 30 mil caminhos e ≤ 4 MB de SVG por modo; se for ultrapassado, reavaliar a opção B ou C. O número vem da medição sintética acima, não de um limite do navegador. **Condição para a decisão ficar firme:** medir a camada real (Terrasen + Adarlan) em celular (emulação com limitação de CPU e um aparelho real).

### 3.5 Investigação dos picos de zoom (método, a executar na etapa 0d)

Os quadros longos do zoom (100 a 250 ms) **não têm causa conhecida**. "Primeira rasterização" é só uma hipótese. Método para não assumi-la:
1. Medir **zoom frio** (primeira animação depois de montar a camada) e **zoom quente** (repetido, sem recarregar), cada um com ≥ 5 repetições, e reportar a distribuição, não só o máximo.
2. Medir **nos dois modos** (colorido e sépia) e com a camada **ligada, oculta e ausente**, para separar o custo do SVG do custo do Leaflet e do raster.
3. Atribuir o tempo com **traço do Chrome** (script, estilo/layout, rasterização, composição, decodificação de imagem) e identificar a tarefa que estoura em cada quadro longo.
4. Variar uma causa suspeita de cada vez: tamanho do SVG (151, 604, 1.208 símbolos), `will-change`, `mask-image` ligado e desligado, `opacity`, tamanho do raster.
5. **Celular:** emulação com limitação de CPU (4× e 6×) e, quando houver a camada real, um aparelho de verdade.

Resultado esperado: uma tabela de causa por quadro longo, antes de qualquer decisão definitiva sobre as opções A, B ou C.

### 3.6 Pontos de atenção

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

### 5.1 Valores mestre (registrados **e automatizados**, etapa 0a) [MEDIDO, código em `e34b710`]

Fonte única: [`tests/navegador/mestre.json`](../../tests/navegador/mestre.json) (o teste Vitest `src/lib/proto/mestre.test.ts` lê o mesmo arquivo). Chrome headless, 2400 × 1680, geo v3, hidro alta, estilos A (cor) e B (sépia), `papel=1`.
Para cada caso: **SHA-256 do buffer RGBA inteiro** (2400 × 1680 × 4 bytes), o hash amostral antigo (1 a cada 7 bytes, mantido para continuidade com os documentos anteriores), o hash do plano e o hash do texto do SVG.

| Semente | Estilo | Terrasen | SHA-256 (início) | Amostral | Símbolos / hash do plano | Hash do SVG |
|---|---|---|---|---|---|---|
| 11 | colorido | nenhum | `d7081820f381a2de…` | `a52c1545` |  |  |
| 11 | colorido | raster | `678ec74d97eef557…` | `7ee8a352` | 151 / `8a7cb845` | `77624929` |
| 11 | colorido | vetorial | `237560b8c47ae8f3…` | `97b94061` | 151 / `8a7cb845` | `77624929` |
| 11 | classico | nenhum | `bdf4cda9e138f12f…` | `9377232a` |  |  |
| 11 | classico | raster | `4bdfd16f6a1863c1…` | `2928f70e` | 151 / `8a7cb845` | `16ab64e4` |
| 11 | classico | vetorial | `4916ca52084bd0dc…` | `92b1c104` | 151 / `8a7cb845` | `16ab64e4` |
| 184 | colorido | nenhum | `ee596f5362841b42…` | `a94e991` |  |  |
| 184 | colorido | raster | `b70411bc3e017acd…` | `8ecc34f3` | 153 / `c5ff2649` | `5db22f71` |
| 184 | classico | nenhum | `70dd5f1e418e0f70…` | `9a4afc8d` |  |  |
| 184 | classico | raster | `9d2a6431fb138527…` | `9c4140dc` | 153 / `c5ff2649` | `bdf7bb9c` |
| 21 | colorido | nenhum | `36997057ca84edbf…` | `2be2c6a7` |  |  |
| 21 | colorido | raster | `6b4cd77b12bd068f…` | `de72d19e` | 139 / `7600fc02` | `aa7bf6ce` |
| 21 | classico | nenhum | `63f80cd932fdf78c…` | `3c1e34ed` |  |  |
| 21 | classico | raster | `9bdf7d4687c76bde…` | `2bebbd6d` | 139 / `7600fc02` | `428779f` |
| 37 | colorido | nenhum | `b93b5c8337a6d94f…` | `2fb17098` |  |  |
| 37 | colorido | raster | `d0286a956fada2c9…` | `1b7e8f5c` | 155 / `b60b5273` | `69dfa50c` |
| 37 | classico | nenhum | `e1b955bc20fe951e…` | `7c3038bd` |  |  |
| 37 | classico | raster | `532222b463c6351b…` | `4cbec137` | 155 / `b60b5273` | `1a357b5c` |

Leitura:
- **Semente 11 é a referência aprovada.** Os valores dela coincidem com os que já estavam nos documentos anteriores (`a52c1545`, `9377232a`, `8a7cb845`, `77624929`, `16ab64e4` etc.).
- **"Terrasen = nenhum"** é o mapa padrão; **"raster"** tem os símbolos desenhados no raster; **"vetorial"** é o raster sem os símbolos de Terrasen (a camada SVG os desenha).
- **Outras sementes:** em `validarLugares` com os pontos de controle e as cordas da v3, **só a semente 11 passa** (0 violações; as sementes 1 a 400 foram testadas, e a melhor das outras, a 184, tem 5 violações). Portanto **não existe outra semente "válida"** no sentido da geografia aprovada. As sementes **184, 21 e 37** (as de menos violações) entram como **sementes de estresse**: não afirmam um mapa válido, só detectam código que dependa em segredo da semente 11. O teste de Vitest registra essa conclusão.
- O hash do plano de Terrasen **é igual no Vitest e no navegador** em todas as sementes (verificação cruzada).
- Hashes de **plano e de SVG** são texto determinístico (igualdade estrita). O **SHA-256 do buffer** depende do navegador/GPU: a igualdade vale na mesma máquina e no mesmo Chrome (duas execuções seguidas deram o mesmo valor). **Tolerância entre ambientes serve somente para DIAGNÓSTICO** (localizar e medir uma diferença com o comparador de pixels); **nunca** é critério de aprovação nem motivo para alterar um valor mestre: o mestre só muda por atualização deliberada, registrada e aprovada (`npm run mestre:atualizar -- --motivo "..."`).
- **Comparador de pixels** (`tests/navegador/pixels.ts`): quando o SHA-256 muda, compara o buffer com o *golden* local (`tests/navegador/golden/`, ignorado pelo git, ≈ 117 MB) e relata: nº de pixels diferentes, percentual, maior diferença, caixa delimitadora e as regiões (células de 160 px) com mais diferenças, além de uma imagem de diferenças em `tests/navegador/resultados/`.
- **Os goldens são sempre recuperáveis da referência original `e34b710`** e **nunca** saem do código em desenvolvimento: `npm run golden:referencia` cria um *git worktree* temporário do commit de referência, serve aquele código e só grava um golden se o render reproduzir o SHA-256 mestre. Gravar golden à mão (`GERAR_GOLDEN=1` sem o runner) falha. O teste também rejeita um golden cujo SHA-256 não seja o valor mestre. Procedimento completo em [`tests/navegador/README.md`](../../tests/navegador/README.md).
- **Outros ambientes (o SHA-256 dos pixels depende do ambiente de renderização).** Os valores mestre de pixels foram gravados em **Windows 11 (10.0.26300), Google Chrome 157.0.8103.80, headless, renderização por software do Playwright**. Mudar de máquina, de versão do Chrome, de sistema ou de GPU pode alterar bytes do canvas **sem que o código tenha mudado**. Regras, nada flexibilizado automaticamente:
  1. **Hashes de plano e de SVG** são texto determinístico e **continuam estritos em qualquer ambiente**.
  2. O **SHA-256 dos pixels** é estrito **no ambiente em que foi gravado**. Em outro ambiente, o teste **falha** com a mensagem "O MAPA MUDOU"; **nada é relaxado nem regravado sozinho**.
  3. **Como distinguir ambiente de regressão:** (a) se plano e SVG batem e só o SHA-256 dos pixels difere, suspeite do ambiente; (b) rode `npm run golden:referencia` **naquele ambiente**: ele renderiza o commit de referência `e34b710` e exige que o resultado reproduza o mestre. Se **nem a referência** reproduz o mestre, o ambiente é diferente (não há regressão do código atual); se a referência reproduz e o código atual não, é **regressão** e vale a regra de interromper e diagnosticar.
  4. **Para trabalhar em outro ambiente de forma legítima**, o caminho é **gravar uma referência própria do ambiente a partir do commit `e34b710`** (nunca do código em desenvolvimento) e registrá-la de forma deliberada, com motivo, ao lado do mestre original: isso **ainda não está implementado** e será proposto antes de ser necessário. Até lá, a conclusão "passou" para pixels só vale no ambiente de gravação.
  5. Comparações com tolerância (≤ 1/255 por canal e uma fração mínima de pixels, usando `pixels.ts`) servem apenas como **diagnóstico** de um relatório, nunca como critério de aprovação do mestre.
- **Atualização deliberada dos valores mestre:** `npm run mestre:atualizar -- --motivo "..."` (recusa sem motivo). A seção `referencia` de `mestre.json` (os SHA-256 originais de `e34b710`) **nunca é reescrita**; cada atualização entra em `atualizacoes` com data, commit do código, casos alterados, SHA-256 anteriores e o motivo. Um teste de Vitest **falha** se `casos` diferir de `referencia` sem uma entrada registrada.
- **Prova de que o portão funciona:** trocar `#527A70` por `#527A71` (1/255 de diferença) na paleta de Terrasen fez o teste falhar com "72.239 pixels diferentes (1,79%), maior diferença 1/255, caixa [1285, 19, 2047, 457]". A alteração foi revertida.

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
| **R9 · Envelhecimento** | raster e vetor iguais (seção 2) | equivalência `desenharVinheta` × `vinhetaEm`, tolerância 2/255 (**implementada na 0b**: `tests/navegador/envelhecimento.pw.ts`) | sempre (navegador) |
| **R10 · Orçamento** | tempo de renderização ≤ +10%; caminhos ≤ 30 mil/modo; SVG ≤ 4 MB/modo; carga inicial | medição repetida (2 execuções) com a mesma ferramenta de hoje | por mudança de bioma |

**Estado:** R1 e R3 existem desde a etapa 0a (`src/lib/proto/mestre.test.ts` e `tests/navegador/mestre.pw.ts`, com o comparador de pixels). **R9 existe desde a 0b.** R5 e parte de R6/R7 existem desde Terrasen. **R2 e a propriedade exclusiva das zonas (parte de R6) existem desde a 0c** (com um bioma sintético que só existe no teste); R8 e R10 entram na 0d; R4, na etapa de Adarlan.

Infraestrutura (**implementada na 0a**): `@playwright/test` como `devDependency`, `tests/navegador/` (config, página vazia, comparador de pixels, `mestre.pw.ts`), scripts `npm run test:navegador`, `npm run golden:referencia` e `npm run mestre:atualizar -- --motivo "..."`; usa o Google Chrome instalado (`channel: 'chrome'`), sem baixar navegador. As camadas R1 (plano), R2, R5, R6, R7 rodam em Vitest puro, sem navegador.

---

## 6. Etapas, commits e portões

**Regra de interrupção (revisão):** se **qualquer** valor mestre mudar sem que a etapa tenha previsto uma mudança aprovada, a execução **para**, nada é commitado como "pronto" e eu apresento o diagnóstico (o relatório pixel a pixel, o commit, a causa provável) antes de continuar.

Cada etapa é **pequena, em commits separados**, e só passa por um **portão**: `npm test` + `npm run build` + `npm run test:navegador` (valores mestre) + `git diff` limitado aos arquivos esperados. Entre as etapas eu **paro e apresento o resultado**.

| Etapa | Conteúdo | Portão específico | Estado |
|---|---|---|---|
| **0a** | testes mestre e infraestrutura de navegador (Playwright), comparador de pixels, outras sementes; goldens recuperáveis da referência | os valores mestre foram gerados do código de `e34b710` e conferem com os documentos anteriores | **aprovada** |
| 0b | `envelhecimento.ts`: centralizar a vinheta, **preservando os parâmetros de cada modo**; teste de equivalência raster × vetor (R9) | mestre idêntico; sem vinheta nos símbolos vetoriais coloridos | **aprovada** (seção 9) |
| 0c | módulo `biomas/` com Terrasen como cliente (só o que Adarlan usa), registro, ordem fixa | mestre idêntico; R2 (independência de ordem) | **concluída, aguarda revisão** (seção 10) |
| 0d | `MapaView` para vários biomas (`data-bioma` por símbolo, ordem global por `y`), orçamento provisório (R10), investigação dos picos de zoom (3.5) | mestre idêntico; R8 (vetor × raster) | não iniciada |

Depois da consolidação: Adarlan (protótipo desligado por padrão), conforme o [plano de Adarlan](adarlan/PLANO-ADARLAN.md), comparações, aprovação e merge. A demo só é atualizada depois. Nada disto começa sem aprovação.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Refatoração muda Terrasen sem perceber | valores mestre antes; portão por etapa; commits pequenos |
| Hash de pixels varia entre máquinas | plano e SVG: igualdade estrita em qualquer ambiente; pixels: igualdade estrita **no ambiente de gravação**; em outro ambiente o teste falha e a tolerância serve **só para diagnóstico**, nunca para aprovar nem para alterar valores mestre |
| SVG cresce além do que o celular aguenta | orçamento como teste; medição em celular antes de decidir a opção A definitiva |
| Adarlan pede símbolos que o gravador SVG não suporta | usar só o subconjunto aceito; teste que percorre todos os símbolos (já existe para Terrasen) |
| A transição Terrasen → Adarlan fica com "faixa rala" ou salto de espécie | faixa declarada nos dados, com dono, largura e orçamento de ΔE (ver o plano de Adarlan) |
| Sépia continua desenhando montanhas em Adarlan | o sépia passa a consultar o peso de Adarlan (como faz com Terrasen) |

## 8. Resultado da etapa 0a

**O que foi feito** (nenhum arquivo de `src/` foi alterado, exceto o teste novo; nenhuma mudança visual):

| Item | Arquivo |
|---|---|
| Infraestrutura de navegador | `tests/navegador/playwright.config.ts`, `pagina.html`, `executar.mjs`, `README.md`; `@playwright/test` em `devDependencies`; scripts em `package.json`; entradas no `.gitignore` |
| Comparador de pixels (+ PNG de diferenças sem dependências) | `tests/navegador/pixels.ts` |
| Valores mestre (SHA-256 integral, amostral, plano, SVG) para a semente 11 e 3 sementes de estresse | `tests/navegador/mestre.json`, `tests/navegador/mestre.pw.ts` |
| Teste mestre sem navegador (plano, 4 sementes) | `src/lib/proto/mestre.test.ts` |

**Resultados:**
- `npm test`: **146 testes passam** (140 + 6 novos). `npm run build`: passa.
- `npm run test:navegador`: **21 testes passam** (cerca de 1,5 min): 18 renderizações mestre, comparador, determinismo e igualdade de plano entre colorido e sépia, em 4 sementes.
- Os valores da semente 11 **coincidem** com os registrados antes; os do plano coincidem entre Vitest e navegador.
- **Descoberta que muda o pedido:** nenhuma outra semente de 1 a 400 tem geografia válida. As "outras sementes" são, portanto, de **estresse** (ver 5.1).
- O portão foi **provado**: uma mudança de 1/255 na paleta é detectada e localizada.

**Limitações:** o SHA-256 do buffer só vale no mesmo ambiente de navegador; o golden local não é versionado (≈ 117 MB) e precisa ser gerado em cada máquina com `npm run golden:referencia` antes de refatorar.

## 9. Resultado da etapa 0b (centralização do envelhecimento) — **aprovada**

**Código** (commit específico da 0b): `src/lib/envelhecimento.ts` (novo), `colorir.ts`, `terreno.ts` e `proto/papel-sepia.ts` passam a usá-lo.

| O que foi centralizado | Valor preservado | Antes | Agora |
|---|---|---|---|
| Vinheta do sépia | raio `0,35 · lado curto` a `0,72 · lado longo`; de `(120,80,30,0)` a `(90,52,18,0,55)` | `terreno.ts` (`drawAging`) + cópia analítica em `papel-sepia.ts` | `VINHETA.sepia`, `desenharVinheta(…,'sepia')`, `vinhetaEm(…,'sepia')` |
| Vinheta do colorido | `0,40` a `0,72`; mesmas cores; alfa `0,38` | `colorir.ts` (literais) | `VINHETA.cor`, `desenharVinheta(…,'cor')` |
| Amplitude do grão por pixel | sépia `9`, colorido `8` | literais em `terreno.ts` e `colorir.ts` | `GRAO_PIXEL` (a expressão `(rnd() - 0.5) * k` é a mesma) |
| Tom quente e cor do halo do vetor sépia | `(150,112,64)` e `(238,226,190)` | constantes privadas em `papel-sepia.ts` | `TOM_QUENTE`, `HALO_SEPIA` |

**Não foi tocado (conforme o pedido):** a textura e a intensidade do grão, a máscara de grão e os níveis `PARAMS_PAPEL` do vetor, a ordem de composição (a vinheta continua sendo o último passo de cada pintor, antes da moldura no sépia), e **nenhuma vinheta foi aplicada aos símbolos vetoriais coloridos**. O desenho do canvas monta o gradiente com as mesmas expressões (`Math.min(W,H) * r0`, `Math.max(W,H) * r1`) e as mesmas cadeias de cor (`rgba(120,80,30,0)`, `rgba(90,52,18,0.55)` / `0.38`).

**Validação:**

| Verificação | Resultado |
|---|---|
| Valores mestre, **sem regenerar**: SHA-256 integral dos 18 casos (semente 11 e sementes de estresse), hash do plano, hash do SVG, hash amostral | **todos idênticos à referência** (22 testes de navegador passam, 1,7 min) |
| Teste de Vitest | 154 testes passam (148 + 6 novos); `npm run build` passa |
| `mestre.json` | `casos` e `referencia` **inalterados** (nenhuma regeneração, nenhuma entrada em `atualizacoes`); só o texto da `_nota` foi corrigido para o nome novo do comando |
| Parâmetros | teste que fixa os números atuais de cada modo, do grão, do tom quente e do halo |
| `vinhetaEm` (sépia) × a função antiga copiada literalmente | **idênticas bit a bit** em 1.700 pontos |
| Portão protege o módulo novo | trocar `alfa: 0.38` por `0.39` em `VINHETA.cor` fez o teste falhar (1.269.748 pixels diferentes, 31,49%, diferença máxima 2/255); revertido |

**Equivalência analítica × canvas** (`tests/navegador/envelhecimento.pw.ts`; canvas 2400 × 1680 preenchido com 4 cores-base, vinheta pintada, 1.120 pontos por caso, 8 casos):

| Modo | Diferença máxima | Média | Pontos com diferença arredondada 0 / 1 / 2 / ≥ 3 |
|---|---|---|---|
| Sépia | 1,18 a 1,54 (de 255) | 0,42 a 0,53 | 546 a 640 / 480 a 612 / 0 a 3 / 0 |
| Colorido | 1,27 a 1,45 | 0,41 a 0,49 | (nenhum ponto com diferença ≥ 3) |

Interpretação das diferenças:
- **São arredondamento de 8 bits**, não erro de fórmula: a diferença máxima é ≤ 1,54/255, a média ≈ 0,5, e no máximo 3 de 1.120 pontos chegam a 2 (com a base `232,214,170`).
- **O canvas interpola as cores sem pré-multiplicar.** Com o modelo pré-multiplicado as diferenças passam de 3,2 a 5,2 (média 1,1 a 2,1); portanto o modelo da função analítica é o certo. Isso estava implícito antes; agora está medido.
- Dentro do raio interno o canvas **não altera nenhum pixel** (exato).
- O limite do teste foi fixado em **2/255** a partir dessa medição.
- Efeito prático nos símbolos vetoriais do sépia: ≤ 1,5/255 em relação ao que o raster daria, invisível; o SVG não mudou (hash idêntico).

**Interrupção (regra 9):** não foi necessária; nenhum valor mestre mudou.

**Também nesta etapa (ressalva da revisão 0a):** os goldens agora são recuperáveis a partir de `e34b710` e as atualizações dos valores mestre são deliberadas e registradas (ver 5.1). Foi provado: os 18 goldens foram **apagados e regenerados** a partir de um *worktree* de `e34b710`; as tentativas de gravar golden do código atual e de atualizar o mestre sem motivo foram **recusadas**.

## 10. Etapa 0c (extração mínima do planejador) — concluída, aguarda revisão

Autorizada em 2026-11-25, em **quatro subetapas com commits separados e portão de regressão entre elas** (testes unitários, build e testes de navegador com os valores mestre **sem regenerar**). Terrasen é o **único** cliente real; Adarlan **não** foi implementado nem registrado. **Nenhum valor mestre mudou** em nenhum portão (SHA-256 integral dos pixels, hash do plano e hash do SVG, nos 18 casos; `mestre.json` não foi tocado, `atualizacoes` continua vazia). A regra de interrupção não foi acionada.

### 10.1 Subetapas e portões

| Subetapa | Commit | O que mudou | Portão (testes unitários / navegador) |
|---|---|---|---|
| 0c.1 | `5d93f66` | desenhos de Terrasen (`conifera`, `montanha`, `cores`) saem de `terrasen.ts` **verbatim** para `terrasen-glifos.ts`; a paleta vai para `terrasen-paleta.ts`; nasce o **registro de glifos** (`biomas/glifos.ts`) | 176 / 22 passam |
| 0c.2 | `92fc570` | `aceitador`, `ocupacao` e `amostragem` (`h2`, `sm`, `criarPeso`, candidatos por prioridade) saem do planejador, preservando a ordem das verificações, os limites e o determinismo | 198 / 22 passam |
| 0c.3 | `36c291a` | contrato `BiomaRefinado`, `TERRASEN` como instância, registro de ordem fixa, validação de propriedade das zonas; **R2** com bioma sintético de teste | 214 / 22 passam |
| 0c.4 | `1653c4b` | `colorir.ts` e `terreno.ts` passam a usar o registro (paleta, planejamento, fundos, substituição dos símbolos padrão, desenho); `planoProto`, `protoClassico`, `ProtoPlano` e `filtrarForaDeTerrasen` saem (ficaram sem uso) | 214 / 22 passam |

Congelamentos feitos **antes** de mexer (para provar neutralidade além dos pixels de Terrasen): as operações de desenho de **cada símbolo, estilo e modo** (18 combinações × 12 amostras; hash do texto SVG gravado), **fixadas a partir do código de `e34b710`** em `src/lib/proto/glifos.test.ts` e conferidas depois da extração (incluindo o fato de o estilo C de montanha recusar `clip()`); a sequência de candidatos (8.568 pontos) e a grade de ocupação foram comparadas com **cópias literais do código antigo** (e, no caso da ocupação, com a verificação ingênua todos-contra-todos em 2.000 tentativas).

### 10.2 Estrutura final dos módulos

```
src/lib/
  envelhecimento.ts          (0b) vinhetas, grão e tons do papel: fonte única
  colorir.ts / terreno.ts    pintores raster (colorido e sépia); usam o registro, sem citar Terrasen
  biomas/
    tipos.ts                 ModoDesenho, GlifoBase (campos que o desenho lê)
    glifos.ts                registro de glifos: registrarGlifo, desenharGlifo; recusa sobrescrita silenciosa
    amostragem.ts            sm, h2 (hash determinístico), criarPeso, candidatosPorPrioridade
    ocupacao.ts              grade de ocupação (células de 40 px): livre / ocupar / itens
    aceitador.ts             criarAceitador: as 7 verificações de aceitação, na ordem original
    bioma.ts                 contrato BiomaRefinado, EntradaBioma, PlanoBioma, ParteZona
    registro.ts              BIOMAS_REFINADOS (ordem fixa), ativosDeProto, validarRegistro, emOrdemDeRegistro,
                             aplicarPaletas, planejarBiomas (ocupação compartilhada), filtrarSubstituidos,
                             substituidoEm, desenharFundos; registra os glifos de cada bioma
  proto/                     (nome histórico; Terrasen e a camada vetorial ainda moram aqui)
    terrasen.ts              ESPECÍFICO DE TERRASEN: parâmetros (?terrasen=), dados de arte, ajustes, planejador
                             (cumeeiras, clareiras, bosques, massas), núcleos florestais, lavagens
    terrasen-bioma.ts        TERRASEN: a instância do contrato (liga o código de Terrasen ao registro)
    terrasen-glifos.ts       desenhos de conífera e montanha (A/B/C), cores por modo, registro dos 3 tipos
    terrasen-paleta.ts       PALETA_TERRASEN (inclui bordaSul, preservada), PALETA_ZONAS, aplicarPaleta
    camada-vetorial.ts       SVG dos símbolos (continua específico de Terrasen até a 0d)
    gravador-svg.ts          gravador do subconjunto do canvas em SVG
    papel-sepia.ts           integração do SVG ao pergaminho sépia (usa envelhecimento.ts)
```

| Arquivo | Responsabilidade | Sabe de Terrasen? |
|---|---|---|
| `biomas/aceitador.ts` | decide se um símbolo é aceito (terra, peso, ícones e rótulos, água, rotas, espaçamento) | não |
| `biomas/ocupacao.ts` | memória de espaço ocupado, **compartilhada entre biomas** | não |
| `biomas/amostragem.ts` | hash determinístico, suavização, peso de zona, candidatos | não |
| `biomas/glifos.ts` | tipo de símbolo → função de desenho | não |
| `biomas/registro.ts` | ordem fixa, propriedade das zonas, planejar todos, substituir símbolos padrão, fundos | só importa `TERRASEN` e `ProtoTerrasen` (a ponte do parâmetro de URL) |
| `proto/terrasen*.ts` | tudo o que é próprio de Terrasen | sim |

### 10.3 O que deliberadamente permaneceu específico de Terrasen

- **Cumeeiras** (`terrasen-arte.json`, polilinhas, envelope, tamanhos), **clareiras**, **massas**, **bosques de 3 a 7 árvores**, **núcleos florestais** (`nucleoValor`): ainda não há segundo cliente que os use; extrair agora seria especulação. Se Adarlan pedir bosques ou aglomerados parecidos, só então se generaliza o que for comum.
- **Lavagens** (`desenharWashes`), `AjusteTerrasen` e os parâmetros `?terrasen=`, `?vetor=`, `?papel=` (`ProtoTerrasen`).
- **Paleta de Terrasen** e a constante **`bordaSul`** (preservada, sem uso).
- **Desenhos** de conífera e montanha: estão em módulo próprio, mas são de Terrasen.
- **`camada-vetorial.ts`** (um plano de Terrasen por vez), `MapaView.vue`, `store` e URL: a generalização é a **0d**.
- O nome do diretório `proto/` (renomear para `biomas/terrasen/` é cosmético e fica para quando Adarlan existir).

### 10.4 R2 e os testes novos (nenhum bioma real além de Terrasen)

`src/lib/biomas/registro.test.ts` usa um bioma **sintético** que só existe no teste (ele tenta preencher a mesma janela que Terrasen, ignorando de propósito o próprio peso, para forçar a disputa por espaço):

| Prova | Resultado |
|---|---|
| Registrar o segundo bioma **não altera nenhum símbolo de Terrasen** | a lista de Terrasen (151) é **idêntica, símbolo a símbolo**, com e sem o sintético; também reproduz o hash mestre `8a7cb845` |
| A ordem em que os biomas são passados não importa | o registro impõe a sua ordem (`terrasen`, `sintetico`) e o resultado é o mesmo |
| O segundo bioma **respeita a ocupação do primeiro** | todos os pares (sintético × Terrasen) cumprem `d ≥ 0,5 · (r + r′) · 0,95`; o sintético coloca mais de 20 símbolos (o teste não é vazio) |
| Controle negativo | sem a ocupação compartilhada, o sintético **colide** com Terrasen (> 10 colisões) |
| A ordem do registro é o que protege Terrasen | se o sintético viesse **primeiro**, os símbolos de Terrasen **mudariam** |
| **Propriedade exclusiva das zonas** | nenhuma zona de `biomas.json` pertence a dois biomas; Terrasen possui exatamente `r03-terrasen`, `r03-pinhal-denso` e `r03-montanhas-norte`; o validador detecta zona disputada, id repetido e paleta sobre zona alheia |
| **Determinismo do registro** | dois planejamentos iguais dão os mesmos planos e a mesma ocupação |
| Paleta e substituição | `aplicarPaletas` com Terrasen = `aplicarPaleta`; as zonas dos outros biomas passam intactas (mesmo objeto); `filtrarSubstituidos` = filtro antigo (`peso ≤ 0,12` permanece) |

Também: testes do registro de glifos (tipo desconhecido é erro; outra função para o mesmo tipo é erro; a mesma função, inofensivo), da grade de ocupação, do aceitador (cada motivo de recusa, sem deixar rastro; ordem: lago/rio só é consultado depois das verificações anteriores; margens 0,8 e 0,3 do tamanho) e da amostragem.

### 10.5 Compatibilidade

- **Parâmetros de URL:** `?terrasen=A|B|C|AB`, `?vetor=0`, `?papel=0|1|2`, `?estilo=classico` continuam como antes (`urlState.ts` e `store` não foram tocados). Verificado no app real, sem erros de console, em 6 combinações (padrão, `AB`, `AB` sépia, `C` com `vetor=0`, `A` sépia com `papel=2`, `AB` sépia com `vetor=0`); o número de símbolos do SVG continua 151.
- **Mapa padrão** (sem `?terrasen`): SHA-256 dos pixels idêntico ao de `e34b710`, em cor e sépia, nas 4 sementes.
- **Costa, hidrografia, lugares, rotas, outros biomas, interface:** nenhum arquivo de dados ou de interface foi alterado; a demo não foi atualizada.

### 10.6 Resultado final desta etapa

| Verificação | Resultado |
|---|---|
| Testes unitários | **214** passam (176 após a 0c.1; 198 após a 0c.2) |
| Build (`vue-tsc` + Vite) | passa |
| Testes de navegador | **22** passam: SHA-256 integral dos pixels, plano e SVG dos 18 casos idênticos à referência |
| `mestre.json` | inalterado (`atualizacoes`: 0 entradas) |
| Interrupções | nenhuma |

**Ocorrência no portão final da 0c (registrada, causa desconhecida).** O portão final da 0c foi rodado como uma **única linha de comandos** encadeada (testes unitários, build, testes de navegador, `git status` e `git push`), com a saída filtrada por `Select-String`, e **o push aconteceu mesmo com uma falha**. Cronologia:

1. **Falha de causa desconhecida:** nessa linha, a suíte de navegador terminou com `1 failed, 5 passed (27,2 s)`. O filtro de saída mostrou só as linhas de resumo; a mensagem do teste que falhou **não foi vista nem guardada**. Nenhuma linha `O MAPA MUDOU` apareceu (essa mensagem era parte do filtro), o que indica que **não foi uma divergência de valor mestre**, mas isso é indício, não prova.
2. **Push indevido:** como os comandos estavam encadeados sem testar os códigos de saída, `git push origin bioma-adarlan` rodou na mesma sequência. Os commits enviados eram os mesmos que haviam passado em cada portão individual das subetapas (0c.1 a 0c.4), e nenhum código quebrado foi publicado, mas o processo **permitiu** publicar com uma falha. Isso é um defeito do processo, e o reconheço.
3. **Suspensão do computador:** uma nova execução, em segundo plano, durou **1,9 h** (o relógio saltou de dia) e terminou com `1 failed, 3 passed`; o erro foi `Test timeout of 300000ms exceeded` em `mestre 11|colorido|raster`. A duração indica que o computador **entrou em suspensão** durante a execução.
4. **Três execuções posteriores bem-sucedidas** da suíte completa no commit `adf8abc`: `22 passed` (2,5 min), `22 passed` (2,5 min) e `22 passed` (2,1 min). Os valores mestre (SHA-256 dos pixels, plano e SVG) ficaram idênticos à referência em todas.
5. **Causa da falha do item 1: não confirmada.** Uma hipótese era um servidor de desenvolvimento órfão da verificação rápida feita pouco antes (`reuseExistingServer: true` pode reaproveitar um servidor remanescente), mas **é só uma hipótese**: não há log nem reprodução que a sustente, e **não deve ser tratada como a causa**. Outras (concorrência de recursos, o Chrome pessoal em uso, a suspensão) também não foram excluídas.

A correção do **processo** (não da causa) está em 10.7.

Observações: (1) o `pesoMont` que o planejador de Terrasen recebe continua sendo calculado (e continua sem uso), para não mudar a assinatura nem nada do que foi aprovado; (2) `registro.ts` importa `TERRASEN` e o tipo `ProtoTerrasen`: é a única ponte conhecida entre o registro e um bioma concreto, e a 0d a substitui por uma configuração por bioma.

### 10.7 Etapa 0c.5: correção do processo de validação e publicação

**Problema:** o portão era uma linha de comandos sem garantia de parada, sem propagação de códigos de saída, com a saída filtrada (a mensagem de uma falha podia não ser vista nem guardada), com servidor de desenvolvimento reaproveitável e sem proteção contra um push feito depois de uma falha.

**Solução** (`scripts/`, commit `fix(portao)`; usa só Node, sem dependências novas):

| Peça | O que garante |
|---|---|
| `npm run portao` (`scripts/portao.mjs`) | roda **testes unitários, build e testes de navegador** em ordem, **para na primeira falha** e sai com código ≠ 0; lê o **código de saída real** de cada etapa (sem pipes, sem filtros); aceita `--so unit,build` para etapas parciais (que **nunca** emitem selo) |
| Logs completos | a saída **inteira** de cada etapa vai para `.portao/logs/<rodada>/<etapa>.log` (inclui o servidor e `resultado.json`), **uma pasta por rodada**: logs de rodadas com falha não são sobrescritos. Na falha, o portão imprime as últimas linhas e o caminho do log |
| `scripts/servidor-guardado.mjs` | o servidor do navegador é filho de um **guarda** que consulta o PID do dono a cada segundo e, quando o dono some (fim normal, erro, Ctrl+C ou **morte à força**), mata **apenas a própria árvore de processos do Vite** (`taskkill /T` no Windows). Porta já ocupada é **erro** (o portão não reaproveita nem encerra servidores alheios) |
| Selo `.portao/ultimo.json` | emitido **somente** quando o portão **completo** passa, a árvore está **limpa** e o `HEAD` não mudou; **qualquer** saída ≠ 0 (falha, interrupção, erro) **sobrescreve** o selo com `ok: false`, então um OK antigo nunca sobra |
| `npm run publicar` (`scripts/publicar.mjs`) | roda o portão e só faz `git push` **se ele passar, no mesmo processo**; recusa árvore suja; propaga o código de saída |
| Hook `pre-push` (`.githooks/`, ativado por `npm run hooks:instalar`, já ativado neste repositório) | **bloqueia qualquer `git push`** cujo commit não tenha sido selado pelo portão completo (um commit mais antigo contido no selado, como uma tag, passa). Exclusão de referência remota não é bloqueada. `.gitattributes` mantém o hook com fim de linha LF |

**Demonstração com falhas propositais** (sem enviar nada quebrado ao remoto: um **remoto de teste local**, um repositório *bare* em pasta temporária, e uma branch temporária, ambos apagados depois):

| Cenário | Resultado |
|---|---|
| **A1.** Commit com um teste que falha de propósito (`expect(1).toBe(2)`) e `publicar` para o remoto de teste | o portão falha na etapa `unit` (`1 failed | 214 passed`), `publicar` sai com **código 1**, "Nada foi publicado"; `git ls-remote` do remoto de teste **vazio**; `unit.log` guarda a saída completa (`AssertionError: expected 1 to be 2`); selo com `ok: false` |
| **A2.** `git push` direto do mesmo commit | o hook **recusou**: "o último portão NÃO passou por completo"; remoto de teste vazio |
| **B.** Erro proposital **depois** de o servidor subir | portão sai com código 1, selo `ok: false`; **0 processos do servidor** e **porta 5191 livre** logo depois |
| **C.** Portão **morto à força** (`Stop-Process -Force`) com o servidor no ar | o guarda encerrou o servidor em **0,3 s**; **0 processos** e porta livre; um processo **alheio** (um `node` escutando a porta 5199, criado só como controle) **continuou vivo** |

Dois defeitos do próprio portão foram encontrados e corrigidos durante a demonstração: (1) uma falha **não** sobrescrevia o selo (agora sempre sobrescreve); (2) a verificação da porta usava `127.0.0.1`, mas o Vite escuta em `localhost`/IPv6 nesta máquina, então o servidor "não subia" (agora usa `localhost`).

**Uso a partir de agora:** `npm run portao` para validar; `npm run publicar` para publicar. **Não se faz `git push` encadeado a outros comandos.** Os logs de falha ficam em `.portao/logs/` (ignorados pelo git).
