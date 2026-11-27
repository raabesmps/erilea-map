# Adarlan: revisão artística e canônica (antes de implementar)

**Status:** revisão do [PLANO-ADARLAN.md](PLANO-ADARLAN.md) depois da consolidação técnica (etapas 0a a 0d, [CONSOLIDACAO-TECNICA.md](../CONSOLIDACAO-TECNICA.md)). É um **relatório de revisão artística**, não uma nova consolidação. **Nada de Adarlan foi implementado**; geografia, hidrografia, lugares, rotas, valores mestre e demo não mudam; sem merge.

Legenda (mais estrita que a do plano):

| Marca | Significado | Pode orientar a arte? |
|---|---|---|
| **[MAPA]** | visto no mapa impresso, nos recortes que já existem em `referencia-local/` | sim |
| **[MAPA?]** | precisa do recorte do impresso que **ainda não tenho** | só depois da leitura |
| **[CÂNONE?]** | vem da **minha memória** dos livros; precisa da sua conferência | não, até ser conferido |
| **[INFERÊNCIA]** | deduzido de outros fatos (mapa, cânone, dados do projeto) | com cautela, declarado |
| **[ARTE]** | decisão puramente artística, sem pretensão de fato | sim, por aprovação visual |
| **[TÉCNICO]** | consequência da arquitetura construída | sim |

---

## 1. O que a consolidação muda no plano (itens 1 e 2)

A arquitetura entregue nas etapas 0a–0d torna várias propostas do plano **mais simples, mais estritas ou desatualizadas**:

| # | Proposta do plano | Situação após 0a–0d | Atualização |
|---|---|---|---|
| 1 | "Planejador genérico com Terrasen como cliente" | existe: `BiomaRefinado`, registro de ordem fixa, aceitador, ocupação compartilhada, amostragem (`h2`, `criarPeso`, candidatos) | Adarlan é **um segundo `BiomaRefinado`** registrado **depois** de Terrasen; nenhuma refatoração nova |
| 2 | Bosques com "a mesma maquinaria de Terrasen (núcleos, clareiras, massas)" | essas peças **ficaram em `proto/terrasen.ts` de propósito** (seção 10.3 da consolidação) | os bosques de Adarlan começam **próprios** do bioma; só se extrai algo comum quando o protótipo mostrar que o comportamento é de fato o mesmo |
| 3 | Símbolos "precisam usar só o subconjunto do canvas aceito pelo gravador SVG" | o registro de glifos e o `GravadorSvg` existem; o teste que percorre os glifos existe para Terrasen | cada glifo novo é registrado em `biomas/glifos.ts` e entra no mesmo teste de **operações congeladas** (como `glifos.test.ts`) assim que for aprovado |
| 4 | "Sépia desenha 25 montanhas em Adarlan; o sépia precisa consultar o peso de Adarlan" | `substituidoEm` / `filtrarSubstituidos` já fazem isso **para qualquer bioma ativo** pelo `pesoSubstituicao` | não exige código novo; Adarlan só declara o seu `pesoSubstituicao` (a calibrar: Terrasen usa 0,12). Isso tira as montanhas do **raster** dentro da pegada, **não** fora dela |
| 5 | "Um SVG por modo, `data-bioma`, ordem global por y" | **pronto** (0d.1); intercalação testada com o sintético | Adarlan entra no mesmo SVG; R8 é **repetida com o bioma real** |
| 6 | "Novos parâmetros `?biomas=terrasen,adarlan`, `?adarlan=AB`, `store.biomas`" | a 0d **não** mudou store nem URL; o contrato tem `parametroUrl` + `configDaUrl` | Adarlan declara `parametroUrl: 'adarlan'`; `?biomas=` **não** é necessário. A store ganha **um** campo (`adarlan`) quando o protótipo existir, como `terrasen` |
| 7 | "Densidade ≥ 6 na faixa de transição", "Clark-Evans ≤ 1,10", "variância/média > 1,6", "CV > 0,2", "vazios ≤ 70/160 px" | essas metas foram **herdadas das métricas de Terrasen** | **revisadas** na seção 9: viram métricas **auxiliares**, sem limites fixados antes do primeiro protótipo |
| 8 | Transição: "a probabilidade de conífera cai de 1 para 0" na faixa | Terrasen é a **primeira** no registro e **não enxerga** Adarlan; o plano de Terrasen é protegido por R1/R2 | Adarlan **não pode tirar nem mover** coníferas de Terrasen; o ecótono só **acrescenta** símbolos de Adarlan nos espaços livres (seção 7) |
| 9 | "Mudar a cor de Adarlan altera pixels até 1,6 do raio das zonas" | R4 ainda não existe | R4 é **a primeira camada de teste** criada com Adarlan (alcance de pixels + 0 pixels no interior de Terrasen) |
| 10 | Desempenho estimado (110 a 140 símbolos, ≈ 1.900 caminhos) | 0d.4: o SVG atual tem 2.020 caminhos (≈ 7% do orçamento provisório); os picos de zoom frio estão associados ao SVG visível, **sem causa confirmada** | estimativa continua válida; a **revisão obrigatória de desempenho** (consolidação 11.7) é condição para a aprovação final |
| 11 | Vinheta | os símbolos **vetoriais coloridos não recebem vinheta** (decisão da 0b) | Adarlan fica mais perto da borda leste: diferença raster × vetor de **≈ 7%** em `x ≈ 0,86` (contra ≈ 5,6% em Orynth). É uma questão **visual**: avaliar no protótipo, em zoom máximo, se os símbolos da costa ficam "claros demais"; mudar isso afetaria Terrasen e exige proposta própria |
| 12 | "Chão em raster (mosaico de campos)" | os pintores raster aceitam `desenharFundos` por bioma (hoje: lavagens de Terrasen) | o mosaico entra como **fundo do bioma** no raster, usando `h2`/ruído próprio, **nunca** o `rnd` compartilhado (senão desloca o mapa inteiro) |
| 13 | O planejador padrão do colorido usa uma grade de 22 px com sorteio | **[TÉCNICO]** ele consome o `rnd` compartilhado; `filtrarSubstituidos` remove os símbolos padrão **depois** de planejar | a sequência aleatória do resto do mapa **não muda** quando Adarlan liga (mesma propriedade que protegeu o mapa com Terrasen) |

O que **não** muda no plano: a direção preliminar de 2026-11-25 (pegada atual, folhosas, bosques concentrados com campos abertos, colinas suaves condicionadas ao relevo, Rifthold só como marcador, salto de linguagem com o Carvalhal aceito temporariamente, A em cor e B em sépia, paleta A provisória).

---

## 2. Afirmações que dependem do mapa impresso ou dos livros (item 3)

### 2.1 Do mapa impresso

O que já foi lido existe só em três recortes (`referencia-local/referencia-impresso-vs-nosso.png`: lago ao norte de Eyllwe, Lago de Perranth, rio de Orynth). **Nenhum recorte cobre o interior de Adarlan.**

| # | Afirmação | Estado |
|---|---|---|
| M1 | Há uma **linha tracejada** logo ao sul do Lago de Perranth | **[MAPA]** visível no recorte; que ela seja a **fronteira política** Terrasen/Adarlan é **[INFERÊNCIA]** |
| M2 | O terreno a leste de Perranth e ao sul do rio de Orynth é **pergaminho quase vazio** | **[MAPA]** só nas bordas dos recortes; o resto da pegada é **[MAPA?]** |
| M3 | A Floresta Carvalhal é uma grande mancha de **pontos** (convenção de floresta) a oeste | **[MAPA]** (borda esquerda dos recortes); o limite leste dela é **[MAPA?]** |
| M4 | Adarlan (a planície central) **não tem montanhas** | **[MAPA?]**: não lido; a direção preliminar a trata como **não validada** |
| M5 | Existem **bosques** isolados dentro da planície | **[MAPA?]**: não lido |
| M6 | Há **elevações suaves** (colinas) no centro-oeste | **[MAPA?]**; hoje só o relevo **gerado** sugere isso |
| M7 | O Avery corre do cruzamento a leste do Carvalhal até a costa em Rifthold | **[MAPA]** (já é geografia aprovada, `rios.json`) |
| M8 | Costa leste com areia e junco | a costa é **[MAPA]**; areia e junco são **[ARTE]** |
| M9 | Outras linhas tracejadas (fronteiras com Melisande, Eyllwe, Carvalhal) | **[MAPA?]** |
| M10 | Sinais de campos, pomares, plantações | **[MAPA?]**: não vistos; sem leitura, campos são **[ARTE]** |

### 2.2 Dos livros (memória minha, a conferir)

| # | Afirmação | Confiança da minha memória | Efeito na arte se estiver errada |
|---|---|---|---|
| C1 | Rifthold é a capital de Adarlan, à beira do Avery, com o castelo de vidro | alta | nenhum (marcador já existe) |
| C2 | **Perranth é uma cidade de Terrasen** (casa nobre de Terrasen), **não** de Adarlan | média-alta | **corrige o plano**, que listava Perranth como "associada a Adarlan": reforça que Perranth pertence ao lado **Terrasen** do ecótono |
| C3 | **Anielle** é uma cidade de Adarlan, perto do Canino Branco e de um lago | média-alta | Adarlan **política** inclui terra montanhosa a oeste, fora da zona artística |
| C4 | **Morath** (fortaleza) fica em Adarlan, no oeste montanhoso | média | idem |
| C5 | **Endovier** (minas de sal) fica em território controlado por Adarlan, perto do Carvalhal | **baixa** (não lembro se é Adarlan ou território conquistado) | nenhum na pegada; importa para a fronteira política |
| C6 | **Meah** é uma cidade costeira de Adarlan | **baixa** | nenhum na pegada |
| C7 | A Floresta Carvalhal (Oakwald) é de **carvalhos**/folhosas | média | sustenta as **folhosas** em Adarlan |
| C8 | O centro de Adarlan é **terra agrícola** com cidades e estradas | **baixa** (impressão geral, sem passagem lembrada) | os **campos agrícolas** viram decisão só artística |
| C9 | Estradas imperiais ligam Rifthold às províncias | baixa | nenhum: **estradas não serão desenhadas** (rotas são geografia aprovada) |
| C10 | A planície central é baixa, sem cordilheiras | baixa | condiciona as colinas (M4/M6) |

**Consequência principal (C3, C4):** se confirmados, a **Adarlan política** é muito maior que a zona artística e **inclui montanhas** (o oeste, com o Canino Branco). Portanto a frase do plano "Adarlan não tem montanhas" **só pode valer para a zona artística** (a planície central), e mesmo isso depende de M4.

---

## 3. Canônico × inferência × decisão artística (item 4)

| Tema | Canônico (a conferir) | Inferência | Decisão puramente artística |
|---|---|---|---|
| Capital e rio | Rifthold no Avery (C1) | — | Rifthold **só como marcador**, sem silhueta urbana |
| Vegetação dominante | Carvalhal de carvalhos (C7) | folhosas na planície vizinha | **folhosas** como espécie; forma do símbolo (A/B/C) |
| Composição | — | planície aberta (M2, C8) | **bosques concentrados** + **campos abertos intencionais**; corredores de árvores ao longo do Avery e do rio de Orynth |
| Campos agrícolas | C8 (baixa) | — | **testar** mosaico orgânico e discreto **no raster**; sebes depois |
| Relevo | C10 (baixa) | relevo gerado | colinas suaves em ondulação, **só se** M4/M6 confirmarem |
| Fronteira com Terrasen | Perranth em Terrasen (C2) | tracejado = fronteira (M1) | ecótono **artístico** na faixa; a fronteira política **não é desenhada** |
| Costa | costa aprovada (M8) | — | areia e junco como acabamento |
| Cor | — | — | **paleta A provisória** (B e C alternativas) |
| Montanhas no sépia | — | a pegada é planície (M4?) | 0 montanhas **dentro da pegada artística**; fora dela, nada muda |
| Lugares fora da pegada (Endovier, Meah, Anielle, Morath) | C3–C6 | — | **ficam fora** da zona artística (direção preliminar: sem expandir) |

---

## 4. Referências que preciso receber de você (item 5)

| # | Referência | Para quê | Prioridade |
|---|---|---|---|
| R-1 | **Recorte do mapa impresso cobrindo Adarlan inteira**: de Perranth/Endovier (norte) até Rifthold e a costa sul, do limite leste do Carvalhal até o mar (no nosso mapa, ≈ `x 0,62–0,90`, `y 0,18–0,60`), na maior resolução possível, salvo em `referencia-local/` (não é publicado) | M2–M6, M9, M10: bosques, relevo, tracejados, campos | **bloqueante** para distribuição espacial (protótipo 3) e para as colinas |
| R-2 | **Conferência dos itens C1–C10** (basta "certo / errado / não sei" em cada um) | separar o canônico da minha memória | alta; C2, C3 e C8 primeiro |
| R-3 | **Referências de estilo de folhosas** que você goste em mapas ilustrados (prints de mapas de fantasia, gravuras, o seu próprio traço), uma para a **cor (A)** e uma para a **gravura do sépia (B)** | desenhar os glifos novos sem copiar arte oficial | alta para o protótipo 2 |
| R-4 | **Referência de textura de campos** (se tiver uma preferência: retalhos de cor, hachura leve, nada) | mosaico do chão | média; sem ela, apresento três variações |
| R-5 | **Referência de junco/areia de costa** | acabamento da costa | baixa |
| R-6 | Confirmação do **nome PT** de lugares que vou citar nas imagens (Carvalhal, Forte da Fenda/Rifthold, Meah, Avery) | rótulos das folhas de comparação | baixa |

Regras para as referências: ficam em `referencia-local/` (ignorado pelo git) quando contêm arte oficial; servem para **ler** posições e convenções, nunca para decalcar.

---

## 5. Zonas artísticas × fronteiras políticas (item 6)

**Princípio:** as zonas de `biomas.json` são **limites artísticos de vegetação e cor** (elipses com borda deformada por ruído). **Não** representam fronteiras de reino e **não** são desenhadas como linhas. A fronteira política de Adarlan **não aparece** no mapa (nem hoje, nem na proposta).

| Camada | O que é | Onde está | Muda nesta fase? |
|---|---|---|---|
| **Pegada artística de Adarlan** | terra com peso de `r05-adarlan` > 0,5: faixa de ≈ 0,16 × 0,33 do mapa (`x 0,70–0,86`, `y 0,23–0,56`), entre o Carvalhal (oeste), Terrasen (norte), a costa (leste) e Melisande/Eyllwe (sul) | `r05-adarlan` | **não** (pegada mantida) |
| **Sub-zona de campos** | `r05-adarlan-campos` (`0,80 · 0,45`, peso 0,6): em volta de Rifthold | `biomas.json` | **não** a forma; só a cor (paleta) |
| **Faixa de transição norte** | ecótono Terrasen → Adarlan, `y ≈ 0,20–0,27` | a declarar em `adarlan-arte.json` | nova, **artística** |
| **Adarlan política** (cânone, a conferir) | provavelmente inclui Anielle, Morath, o oeste montanhoso, talvez Endovier e Meah (C3–C6); **não** inclui Perranth (C2) | **não existe nos dados** | não |
| **Fronteira política Terrasen/Adarlan** | provável tracejado ao sul do Lago de Perranth (M1) | **não existe nos dados** | não |

Consequências:
- Lugares politicamente de Adarlan ficam **fora** da pegada artística (Anielle, Endovier no Carvalhal; Meah na costa baixa) e **continuam** com a arte das zonas em que caem hoje. Isso é deliberado (direção preliminar).
- "Sem montanhas" vale **só para a pegada artística**; o Canino Branco e a Ruhnn seguem como estão.
- A faixa de transição **segue o desenho**, não a fronteira: mesmo que o tracejado do impresso confirme a fronteira em `y ≈ 0,22`, o ecótono pode ter outra largura.

---

## 6. Paleta (item 7)

Sem mudanças em relação ao plano:

| | Chão | Campos | Copa | Situação |
|---|---|---|---|---|
| **A** | `#95994A` | `#A5936B` | `#244E2D` | **provisória**; única que atende ΔE ≥ 12 contra todos os vizinhos no chão e nos campos |
| B | `#919951` | `#A8A06C` | `#244E2D` | alternativa (mais perto do guia; campos fracos contra o padrão: 7,2) |
| C | `#9D9C51` | `#B3A477` | `#244E2D` | alternativa (melhor contraste da copa; campos fracos contra Eyllwe-ouro: 7,8) |

O que a revisão acrescenta:
1. **A decisão é visual, no mapa renderizado**, com as três paletas lado a lado (protótipo 1); o ΔE é auxiliar.
2. **O mosaico de campos muda a cor média percebida.** Os ΔE do plano foram calculados para chão **liso**; com mosaico, comparo a **cor média renderizada** e a sua dispersão, não só a cor-base.
3. **No sépia não há paleta de zona**; a identidade do chão no sépia vem de **lavagem/textura** (como as clareiras e massas de Terrasen), a ser proposta no protótipo 1.
4. Mudar a cor de Adarlan altera pixels **fora da pegada** pela mistura natural de cor nas bordas (Carvalhal, Melisande, Eyllwe): é medido por **R4** e precisa da sua aprovação visual, mas **nunca** toca o interior de Terrasen.

---

## 7. Transição Terrasen–Adarlan, revista (item 8)

**Restrições:** os símbolos, as cores e o interior aprovado de Terrasen **não mudam**. Tecnicamente isso já é garantido: Terrasen é a primeira no registro, não enxerga Adarlan, e R1/R2 congelam o plano de Terrasen (151 símbolos, hash `8a7cb845`) e os pixels.

**Diagnóstico que continua válido:** faixa rala em `y ≈ 0,22` (4,9 símbolos por 10 mil px² com Terrasen refinada, contra 7 a 10 dos lados) e troca seca de espécie (conífera → árvore redonda).

**Estratégia revista:**

| Peça | Antes (plano) | Agora |
|---|---|---|
| Mecanismo | "probabilidade de conífera cai de 1 para 0" | Adarlan **só acrescenta**: nos espaços **livres** da faixa (ocupação compartilhada), coloca símbolos próprios; as coníferas de Terrasen ficam onde estão |
| Espécie no ecótono | mistura conífera/folhosa | **duas opções** para comparar: **(T1)** só folhosas de Adarlan, mais esparsas perto de Terrasen; **(T2)** folhosas + algumas coníferas desenhadas **com o glifo de Terrasen sem alteração** (registrado como `conifera`), atribuídas a Adarlan (`data-bioma="adarlan"`). A T2 suaviza a troca de espécie, mas põe símbolos "de Terrasen" fora de Terrasen: **decisão sua** |
| Símbolos padrão na faixa | não tratado | onde nenhum bioma passa do `pesoSubstituicao`, as árvores redondas antigas **continuam**; o ecótono precisa declarar até onde Adarlan as substitui (senão sobra a mistura velho/novo) |
| Cor | `bordaSul` (`#66875F`) de Terrasen | `bordaSul` **continua preservada e sem uso**. Usá-la mudaria pixels de Terrasen, então fica fora. A cor da faixa vem da **paleta de Adarlan** misturada pelo campo de cor existente; o ΔE por faixa de 0,03 é medido (hoje 5 a 8) |
| Limite de alcance | "Terrasen não muda" | medido por **R4**: **0 pixels** diferentes onde o peso de Terrasen ≥ 1 (interior) |
| Densidade-alvo | ≥ 6 por 10 mil px² | **sem número fixo**: o objetivo é que a faixa **não se leia como um vão**; a densidade é reportada como métrica auxiliar (seção 9) |
| Perranth (C2) | "associada a Adarlan" | se C2 se confirmar, Perranth e o lago ficam do **lado Terrasen** do ecótono; os símbolos de Adarlan rareiam ao se aproximar deles |

---

## 8. Sequência dos primeiros protótipos visuais (item 9)

Todos **desligados por padrão** (`?adarlan=`), na `bioma-adarlan`, com o portão a cada commit e uma parada para sua avaliação **entre os protótipos**. Imagens sempre em **cor e sépia**, **visão geral e zoom máximo**, **antes × depois**.

| # | Protótipo | O que entra | O que **não** entra | O que você avalia | Depende de |
|---|---|---|---|---|---|
| **P1** | **Identidade do chão** | paletas A, B e C no raster; 3 variações de **mosaico de campos** (nenhum, retalhos suaves, retalhos + leve hachura) só no raster; proposta de **lavagem no sépia**; remoção das montanhas padrão na pegada (sépia) | nenhum glifo novo (os símbolos padrão ficam visíveis numa variante e ocultos em outra, para julgar o chão sozinho) | se Adarlan se distingue dos vizinhos; se o mosaico parece natural ou artificial; paleta | R-4 (opcional) |
| **P2** | **Novos glifos** | folhosa A/B/C, bosque (grupo), colina em ondulação, junco; folha de símbolos em 1× e zoom máximo, cor e sépia, sobre o chão aprovado no P1 | distribuição no mapa (os glifos aparecem em folha, não no mapa) | forma, legibilidade, coerência com a linguagem de Terrasen | P1 aprovado; R-3 |
| **P3** | **Distribuição espacial** | `adarlan-arte.json` (bosques, corredores do Avery e do rio de Orynth, campos abertos, colinas se confirmadas), ecótono T1/T2, borda com o Carvalhal | camada vetorial (tudo no raster primeiro, para comparar com o "antes") | composição, campos abertos intencionais, transição | P2 aprovado; **R-1 (bloqueante)**; R-2 |
| **P4** | **Integração colorido × sépia** | camada vetorial com Terrasen + Adarlan reais (`data-bioma`, ordem global), `papel=1`, R4 implementada, R8 repetida com o bioma real | otimizações de desempenho | coerência entre os modos, nitidez no zoom, vinheta na costa leste (item 11 da seção 1) | P3 aprovado |
| — | **Revisão de desempenho** | consolidação 11.7: aparelho real, Chrome/Safari/Firefox, carregamento inicial, primeira troca de modo, zoom frio/quente, tempo de renderização | — | condição para a aprovação final | P4 |

---

## 9. Critérios de aceitação de Adarlan (item 10)

As métricas de densidade de Terrasen **não** se aplicam automaticamente: Adarlan é uma planície com vazio **intencional**, e o defeito dela é o **oposto** do de Terrasen (regularidade de grade, não falta de massa).

### 9.1 Critérios obrigatórios (testes, sem exceção)

| # | Critério | Como |
|---|---|---|
| O1 | Terrasen **não muda**: plano, SVG de referência e pixels de Terrasen iguais aos valores mestre | R1, R2 |
| O2 | Mapa padrão (sem `?adarlan`) igual à `v1.0.0` | R3 |
| O3 | Pixels só mudam dentro do alcance declarado das zonas de Adarlan e da faixa de transição; **0 pixels** no interior de Terrasen | R4 (nova) |
| O4 | Costa, hidrografia, lugares, rotas, outros biomas intactos | R5 |
| O5 | Símbolos em terra, na pegada (ou na faixa declarada), ≥ 14 px da água, ≥ 13 px das rotas, fora de ícones e rótulos, sem sobreposição com Terrasen, determinísticos, sem `rnd` compartilhado | R6 |
| O6 | **0 montanhas dentro da pegada artística**, nos dois modos | teste por tipo de símbolo |
| O7 | Mesmo plano de símbolos no colorido e no sépia (o que muda é o estilo) | teste de plano |
| O8 | Camada vetorial: 0 duplicações, alinhamento 0 px, troca de modo sem quadro incoerente | R8 |
| O9 | Glifos só com o subconjunto do canvas aceito pelo gravador; operações congeladas depois da aprovação | teste de glifos |
| O10 | Orçamento provisório de caminhos e tamanho do SVG por modo | R10 |
| O11 | **Revisão de desempenho** da consolidação 11.7 concluída antes da aprovação final | relatório |

### 9.2 Critério artístico (decisivo)

**Sua aprovação visual** nas folhas de comparação de cada protótipo (cor e sépia, visão geral e zoom máximo, antes × depois). Nenhuma métrica substitui isso.

### 9.3 Métricas auxiliares (reportadas, sem limites fixados agora)

Calculadas **separadamente** por sub-área (bosques, campos abertos, corredores, ecótono), porque misturá-las dá números sem sentido numa planície:

| Métrica | O que observa em Adarlan | Leitura esperada (não é limite) |
|---|---|---|
| ΔE do chão e dos campos contra cada vizinho (cor média **renderizada**) | se Adarlan se distingue de Melisande, Eyllwe e do padrão | a paleta A dá ≥ 12 no chão liso; com mosaico, verificar |
| Contraste copa × chão | legibilidade das folhosas | ≈ 3 com a paleta A |
| Regularidade (Clark-Evans) **dos símbolos isolados** dos campos | o defeito da grade de 22 px | deve cair dos 1,32 atuais; nada de grade visível |
| Agrupamento (variância/média) **por bosque** | bosques que leem como massa | maior que o atual (1,16) |
| Variação de tamanho (CV) | monotonia | maior que a atual (0,15) |
| Densidade e cor média por faixa de 0,03 no ecótono | se a faixa ainda se lê como um vão | comparar com os lados, não com um número de Terrasen |
| Área e forma dos campos abertos | se o vazio parece intencional | sem limite de "maior vazio" para os campos |

**Regra:** os limites numéricos, se algum, só são fixados **depois** de você aprovar o P3, a partir do protótipo aprovado, e passam a valer como **regressão** (proteger o que foi aprovado), não como meta de desenho.

---

## 10. Decisões que preciso de você (resumo)

1. Referências **R-1** (bloqueante para o P3) e **R-2** (conferência C1–C10); **R-3** antes do P2.
2. Ecótono: **T1** (só folhosas) ou **T2** (folhosas + coníferas com o glifo de Terrasen inalterado, atribuídas a Adarlan), ou decidir só depois de ver as duas no P3.
3. Confirmar a ordem **P1 → P2 → P3 → P4** com parada entre eles.
4. Autorizar o **P1** quando achar oportuno (ele não depende de R-1).
