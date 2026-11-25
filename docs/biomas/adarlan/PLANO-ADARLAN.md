# Adarlan, segundo bioma: diagnóstico, plano técnico e proposta visual

**Status:** diagnóstico e **proposta**, com a **direção preliminar** da revisão de 2026-11-25 incorporada (seção abaixo). Nada disto foi implementado e nada foi mesclado. A branch `bioma-adarlan` parte da `v1.0.0` (`e34b710`) e só contém documentação.
A consolidação técnica que precisa vir **antes** (planejador genérico, envelhecimento, overlays, testes) está em [CONSOLIDACAO-TECNICA.md](../CONSOLIDACAO-TECNICA.md).

**Referências usadas:** o mapa impresso (apenas os recortes que já estão em `referencia-local/`, que não é publicado), os dados do projeto e **a minha memória dos livros, que precisa da sua conferência**.
**Dependência:** a leitura completa de Adarlan no mapa impresso (onde estão bosques, rios e limites) exige o recorte do impresso. A imagem que você enviou no início ficou só na conversa; para classificar com segurança, **reenvie o impresso** ou salve-o em `referencia-local/`.

Legenda: **[MAPA]** visto no impresso · **[CÂNONE]** dos livros (a conferir) · **[ARTE]** interpretação artística · **[MEDIDO]** número obtido nesta análise (estado atual, `v1.0.0`).

## Direção preliminar (revisão de 2026-11-25)

Direção inicial aprovada para orientar o trabalho, **sem substituir a avaliação visual**:

| Tema | Direção |
|---|---|
| Pegada | manter a pegada artística atual; **sem expandir zonas** (Perranth, Endovier, Meah e Anielle ficam fora por ora) |
| Vegetação | **folhosas** como vegetação predominante |
| Composição | bosques concentrados e **campos abertos intencionais** |
| Campos agrícolas | **testar** mosaicos orgânicos e discretos **no raster**; sebes ficam para uma rodada posterior |
| Colinas | suaves, em ondulação, **condicionadas à conferência do relevo** |
| Rifthold | mantém **apenas o marcador** |
| Carvalhal | aceitar **temporariamente** a diferença de linguagem visual |
| Estilos | **A em cor e B em sépia** como direção inicial |
| Paleta | **A selecionada provisoriamente** (chão `#95994A`, campos `#A5936B`, copa `#244E2D`); **B e C permanecem documentadas como alternativas** (seção 4.1). A aprovação definitiva vem **depois da comparação visual no mapa renderizado**; nenhuma delas está implementada |
| Transição com Terrasen | **não pode remover, deslocar ou redesenhar** símbolos aprovados; Adarlan complementa a vegetação **somente dentro da faixa autorizada** |
| Metas quantitativas | são **critérios auxiliares**, não substitutos da avaliação artística |

**Ainda não validado (não tratar como fato):** (1) a **ausência de montanhas** em Adarlan; (2) a **localização política das cidades** (se Perranth, Endovier, Meah e Anielle pertencem a Adarlan); (3) a **presença de campos agrícolas**. Dependem da conferência do mapa impresso e dos itens canônicos.

## 0. Resultado em uma tabela

| | Hoje [MEDIDO] | Meta proposta |
|---|---|---|
| Pegada de Adarlan (terra, peso de zona > 0,5) | 136.896 px² (≈ 3,4% do mapa), `x 0,70–0,86`, `y 0,23–0,56` | igual (a geografia e as zonas não mudam; ver decisão 1) |
| Símbolos, colorido | 66 (4,8 por 10 mil px²) | 110 a 140 (em bosques 8 a 10 por 10 mil px²; em campos 2 a 3) |
| Tipos de símbolo, colorido | 2 (árvore redonda 42, arco de colina 24) | ≥ 5 (folhosa, bosque, colina em ondulação, junco, sebe) |
| Símbolos, sépia | 72 (45 árvores, 25 **montanhas**, 2 colinas) | mesmos tipos e posições do colorido; **0 montanhas** |
| Regularidade (Clark-Evans; 1 = aleatório, > 1 = mais regular) | 1,32 colorido · 1,15 sépia | ≤ 1,10 nos campos |
| Agrupamento (variância/média por célula de 80 px) | 1,16 colorido · 1,34 sépia | > 1,6 (bosques) |
| Variação de tamanho (CV) | 0,15 a 0,16 | > 0,20 |
| Maior vazio | 71 px, aleatório | campos abertos **intencionais** de até ≈ 160 px; bosques sem vazio > 70 px |
| ΔE do chão contra vizinhos | Melisande **5,4**, Eyllwe **7,1**, padrão do mapa **9,4** | ≥ 12 (proposta: 15,9 / 15,4 / 17,7) |
| ΔE dos campos contra vizinhos | Eyllwe-ouro **6,6**, padrão **6,6** | ≥ 12 (proposta: 13,5 / 13,4) |
| Contraste copa × chão | 1,78 (medido no mapa); 2,12 (guia) | ≥ 3 (proposta: 3,15) |
| Transição com Terrasen | faixa rala: **2,7** símbolos por 10 mil px² na faixa `y 0,22`, contra 7 a 10 dos lados; troca seca de conífera para árvore redonda | ecótono declarado nos dados, densidade ≥ 6 |
| Rotas e rios dentro | Endovier–Forte da Fenda 278 de 403 px; Fenda–Wendlyn 187 de 869; Avery 197 de 288; Anielle–Orynth 0 | símbolos ficam a ≥ 13 px das rotas e ≥ 14 px da água (regra herdada) |

Imagens: [diagnóstico anotado](1-adarlan-diagnostico-anotado.png) · [atual em cor × sépia](2-adarlan-atual-cor-x-sepia.png) · [paleta proposta](3-adarlan-paleta-proposta.png). Números brutos: [medidas-atuais.json](medidas-atuais.json).

## 1. Como Adarlan é representada hoje

Duas zonas em `biomas.json` (elipses com borda deformada por ruído, **limites artísticos**, não geográficos):

| Zona | Centro / raios | Chão | Árvore / rocha | Símbolos (probabilidade) |
|---|---|---|---|---|
| `r05-adarlan` | `0,78 · 0,40` / `0,12 · 0,17` | `#8F9C62` | `#42694B` / `#8C8A80` | árvore 0,25 · colina 0,07 |
| `r05-adarlan-campos` | `0,80 · 0,45` / `0,07 · 0,08` (peso 0,6) | `#B4AB74` | herda do padrão | árvore 0,07 |

**Pegada real.** A elipse de `r05-adarlan` é muito maior que a terra que ela cobre: o leste da elipse é mar. A terra efetivamente "de Adarlan" é uma faixa de ≈ 0,16 × 0,33 do mapa, entre a Floresta Carvalhal (oeste), Terrasen (norte), a costa (leste) e Melisande/Eyllwe (sul) ([imagem 1](1-adarlan-diagnostico-anotado.png)).

**Lugares.**

| Lugar | Posição | Peso de Adarlan | Observação |
|---|---|---|---|
| Forte da Fenda (Rifthold) | 0,776 · 0,470 | 1 | dentro, no limite sul da pegada; o Avery passa por ele |
| rótulo "Adarlan" | 0,756 · 0,364 | 1 | dentro |
| Meah | 0,809 · 0,317 | 1 (zona) | em terra baixa da costa, fora da pegada (provavelmente por elevação) |
| Perranth | 0,713 · 0,245 | **0** | cai numa área **sem zona** (peso 0,04 de Terrasen, 0,09 do Carvalhal): é pintada com o "padrão do mapa" |
| Mina de Sal de Endovier | 0,665 · 0,295 | **0** | zona da Floresta Carvalhal (peso 0,48) |
| Floresta Carvalhal | 0,686 · 0,373 | 0,2 | zona `r04-floresta-central` (0,8) |
| Anielle | 0,650 · 0,473 | 0 | Carvalhal (0,74) |

Ou seja, **vários lugares que o cânone associa a Adarlan estão fora da zona artística**. Isso é uma decisão de escopo (seção 9, item 1).

**Símbolos.** O planejador do colorido (`planejarGlifos`) varre uma **grade de 22 px com sorteio por célula**, o que produz um espaçamento regular demais (Clark-Evans 1,32; vizinho mais próximo ≈ 30 px). Só existem duas espécies: árvore redonda (`roundTree`, copa com sombra) e um **arco** isolado de colina (24, sem corpo). Variação de tamanho baixa (CV 0,15). Nenhum agrupamento projetado (variância/média 1,16).

**O colorido e o sépia discordam.** O planejador do sépia (`terreno.ts`) não usa as zonas: usa ruído de cordilheira e de bosque no mapa todo. Resultado em Adarlan: **25 montanhas no sépia e nenhuma no colorido** ([imagem 2](2-adarlan-atual-cor-x-sepia.png)). Como Adarlan é planície [MAPA/CÂNONE a conferir], o sépia está errado ali; é o mesmo problema que Terrasen resolveu fazendo o sépia consultar o peso do bioma.

**Cor.** O chão médio renderizado é `#868D56`, desvio por canal 17,6 / 14,4 / 9,4. O contraste da copa (`#42694B`) com esse chão é **1,78**: as árvores somem. A rocha (`#8C8A80`) tem contraste **1,02** (invisível), mas nenhum símbolo usa rocha em Adarlan.

**Vizinhos (ΔE76 do chão de Adarlan):**

| Vizinho | ΔE | Leitura |
|---|---|---|
| Melisande `#95A872` | **5,4** | a fronteira sul **não se percebe** |
| Eyllwe `#86A468` | **7,1** | idem |
| padrão do mapa `#A9AE7C` | **9,4** | Perranth e Endovier ficam "no padrão", quase iguais |
| Pântano de Pedra `#6E7E52` | 13,4 | limite |
| Floresta Carvalhal `#52664F` | 28,0 | bem distinto |
| Terrasen (paleta nova `#527A70`) | 31,2 | bem distinto |
| Cordilheira Ruhnn / Canino Branco | 23,7 / 25,1 | distinto |
| próprios campos `#B4AB74` | 11,9 | no limite |

Campos (`#B4AB74`) contra Eyllwe-ouro e o padrão: **6,6** (indistinguível). A cor média de Adarlan **não muda** quando Terrasen está ligada.

**Hidrografia e rotas.** Dentro da pegada: Rio Avery (197 de 288 px), nenhum lago. O Lago de Perranth fica na faixa de Terrasen (peso de Terrasen 0,33). Rotas: Endovier–Forte da Fenda (278 de 403 px) e Fenda–Wendlyn (187 de 869). Rotas, rios e lugares são geografia aprovada e **não mudam**.

**Transição com Terrasen (norte)** [MEDIDO, faixas de 0,03 em `y`, `x 0,66–0,88`]:

| Faixa `y` | Símbolos / 10 mil px² (mapa atual; com Terrasen refinada) | O que há | Cor média | Peso Terrasen / Adarlan |
|---|---|---|---|---|
| 0,16 | 7,6 (7,1) | símbolos de Terrasen | `#4C6755` | 0,97 / 0 |
| 0,19 | 6,0 (4,9) | símbolos de Terrasen | `#5A735E` | 0,71 / 0,03 |
| **0,22** | **2,7 (4,9)** | 6 de Terrasen, 1 árvore, 2 colinas | `#6D7F60` | 0,17 / 0,20 |
| 0,25 | 7,0 | 11 árvores, 1 montanha, 1 colina | `#758054` | 0 / 0,47 |
| 0,28 | 7,3 | árvores e colinas | `#757F51` | 0 / 0,66 |

Há uma **faixa rala em `y ≈ 0,22`** (2,7 no mapa atual; 4,9 com Terrasen refinada, ainda abaixo dos 7 a 10 dos lados; é a mesma "faixa de 20 a 30%" que Terrasen havia diagnosticado) e uma **troca seca de espécie** (coníferas viram árvores redondas em uma faixa de 0,03). A cor, ao contrário, faz a transição com ΔE de 5 a 8 por faixa, o que é aceitável. A constante `bordaSul` (`#66875F`), criada em Terrasen para essa transição, **nunca foi usada**.

## 2. Canônico × interpretação

| Ponto | Classificação | Observação |
|---|---|---|
| Adarlan é o império do centro; capital Rifthold, à beira do Rio Avery | [CÂNONE] | no mapa, Rifthold = Forte da Fenda (decisão sua) |
| Planície central e costa, com cidades, campos e estradas | [CÂNONE a conferir] | base da proposta de campos e de menos mata |
| Floresta Carvalhal (Oakwald) a oeste, de **carvalhos** | [MAPA] [CÂNONE a conferir] | no impresso é a grande mancha pontilhada; apoia folhosas em Adarlan |
| Linha tracejada logo ao sul do Lago de Perranth | [MAPA] (recorte local) | provavelmente o **limite** Terrasen/Adarlan; define a faixa de transição |
| Terreno aberto a leste de Perranth e rios de traço duplo | [MAPA] (recortes locais) | pergaminho quase vazio: apoia campos abertos |
| Rio de Orynth desce para sudeste até a costa | [MAPA] | já desenhado (aprovado); vira **corredor** de árvores ribeirinhas, não novo rio |
| Endovier (minas de sal), Perranth, Meah, Anielle associados a Adarlan | [CÂNONE a conferir] | seus pontos estão **fora** da zona artística atual |
| Baía da Caveira / Enseada do Sino na costa leste | [MAPA] | costa aprovada; só o acabamento (areia, juncos) é artístico |
| Estradas imperiais | [CÂNONE a conferir] | **não** serão desenhadas: rotas são geografia aprovada e não se inventam |
| Pomares, plantações, moinhos como símbolos | [ARTE] | não aparecem no impresso; só entram se você aprovar |
| Rifthold: pedra escura e fumaça, castelo de vidro | [CÂNONE] | está nos textos do lugar; um símbolo urbano é opcional (decisão 5) |

**Decisão herdada de Terrasen:** lá ficou "coníferas, sem carvalhos por proximidade com a Floresta Carvalhal". Em Adarlan o raciocínio se inverte: folhosas são coerentes com o Carvalhal e distinguem Adarlan de Terrasen.

## 3. Padrões artificiais identificados

1. **Grade de sorteio:** espaçamento regular demais (Clark-Evans 1,32 no colorido). É o defeito central, o oposto do "sal e pimenta" de Terrasen.
2. **Duas espécies só**, ambas pobres: árvore redonda e arco de colina isolado (24 arcos sem corpo parecem ruído).
3. **Tamanho uniforme** (CV 0,15) e **nenhuma massa**: não há bosque, borda de mata nem corredor de rio.
4. **Sépia × colorido discordam** (25 montanhas contra nenhuma).
5. **Contraste fraco** da copa com o chão (1,78) e **cores quase iguais** às de Melisande e Eyllwe (ΔE 5 a 7).
6. **Perranth e Endovier "no padrão do mapa"**: pintados como terra sem bioma, porque a zona não os cobre.
7. **Faixa rala e troca seca de espécie** na fronteira com Terrasen.
8. **Planície sem identidade de planície:** não há mosaico de campos nem variação do chão; Adarlan se lê como "verde genérico".

## 4. Paleta proposta

Ver a [folha de paleta](3-adarlan-paleta-proposta.png). Mesma regra de Terrasen: **no máximo ΔE 12 em relação ao guia**, com o **máximo de distância dos vizinhos** (busca numérica em Lab).

| Uso | Atual | Proposta | Resultado |
|---|---|---|---|
| Chão `r05-adarlan` | `#8F9C62` | **`#95994A`** (oliva mais quente e amarelada) | ΔE do guia 11,8; Melisande 5,4 → **15,9**; Eyllwe 7,1 → **15,4**; padrão 9,4 → **17,7**; Terrasen-sul 15,3 → 25,2 |
| Campos `r05-adarlan-campos` | `#B4AB74` | **`#A5936B`** (terra, mais escura e menos amarela) | ΔE do guia 11,4; Eyllwe-ouro 6,6 → **13,5**; padrão 6,6 → **13,4**; do novo chão: 21,7 |
| Copa (árvore) | `#42694B` | **`#244E2D`** | ΔE do guia 11,9; contraste com o chão novo **3,15** (era 2,12 no guia, 1,78 no mapa) |
| Copa, face iluminada | n/a | a derivar (≈ `#30693C`) | contraste 2,16 com o chão: serve como luz, não como contorno |

### 4.1 As três paletas candidatas (revisão)

[Folha comparativa](4-adarlan-tres-paletas.png). Chão / campos / copa:

| | Chão | Campos | Copa | ΔE do guia (chão / campos) | Contraste copa × chão / × campos | Menor ΔE do chão contra vizinhos | Menor ΔE dos campos contra vizinhos | Chão × campos |
|---|---|---|---|---|---|---|---|---|
| Atual (guia) | `#8F9C62` | `#B4AB74` | `#42694B` | 0 / 0 | 2,12 / 2,69 | **5,4** (Melisande) | **6,6** (Eyllwe-ouro, padrão) | 11,9 |
| **A** | `#95994A` | `#A5936B` | `#244E2D` | 11,8 / 11,4 | 3,15 / 3,17 | **15,4** (Eyllwe) | **13,4** (padrão) | 21,7 |
| **B** | `#919951` | `#A8A06C` | `#244E2D` | 7,9 / 4,3 | 3,12 / 3,59 | **11,7** (Eyllwe) | **7,2** (padrão) | 13,0 |
| **C** | `#9D9C51` | `#B3A477` | `#244E2D` | 11,0 / 5,9 | 3,32 / 3,86 | **14,8** (Melisande) | **7,8** (Eyllwe-ouro) | 17,1 |

Leitura dos números (a decisão é visual):
- **Só a A atende ΔE ≥ 12 contra todos os vizinhos**, no chão e nos campos.
- **B** fica mais perto do guia (ΔE 7,9 e 4,3), mas o chão fica no limite (Eyllwe 11,7; Melisande 12,2) e os **campos ficam quase indistinguíveis do "padrão do mapa" (7,2), de Eyllwe-ouro (9,8) e de Melisande (11,3)**.
- **C** tem o melhor chão depois da A (menor ΔE 14,8) e o maior contraste da copa (3,32 / 3,86), mas os campos ficam fracos contra Eyllwe-ouro (7,8) e o padrão (8,9).
- A copa `#244E2D` é igual nas três: ΔE do guia 11,9 (no limite da regra de 12) e contraste ≥ 3,1 com o chão.
- Contraste mais alto também escurece a copa em relação ao resto do mapa; só a comparação visual diz se isso agrada.

**Ressalvas honestas.** (1) O ΔE76 é uma métrica simples; a decisão é visual e é sua. (2) `#A5936B` é um marrom-oliva: pode ficar "terroso" demais ao lado do dourado de Eyllwe; vale testar `#A8A06C`-`#A5936B` em tela. (3) Mudar a cor de Adarlan **altera pixels** fora dos símbolos (limite artístico, medido como em Terrasen, alcance ≤ 1,6 do raio da zona), nunca a geografia.

## 5. Variações de símbolos

Seguindo o que funcionou em Terrasen (três variações, A em cor e B no sépia). Os símbolos precisam usar só o subconjunto do canvas aceito pelo gravador SVG (caminhos, quadráticas, transformações).

| | Folhosa (carvalho) | Bosque | Caráter |
|---|---|---|---|
| **A** | copa de três lóbulos, metade iluminada, tronco curto, contorno | 3 a 6 copas sobrepostas em um grupo | coerente com o A de Terrasen; fácil de ler em cor |
| **B** | copa em "nuvem" hachurada, tronco visível, gravura | grupo com hachura compartilhada | o mais "medieval ilustrado"; o melhor no sépia |
| **C** | copa vista de cima (disco com textura) | mancha de copas | a mais próxima do que existe hoje, e a mais plana |

Símbolos novos, comuns às três: **colina em ondulação** (cadeias de 2 a 4 arcos com hachura sob o arco, em vez do arco solitário), **junco** (costa e margem do Avery), **sebe** (traço curto tracejado, só se os campos forem aprovados).

**Minha recomendação:** **A em cor e B no sépia**, como em Terrasen, para o mapa ter uma linguagem só. A decisão é sua.

## 6. Bosques, campos e transições (sem mudar os limites)

Mesma maquinaria de Terrasen (ruído azul de raio variável, núcleos com borda fractal, hash determinístico), com **linguagem diferente**:

1. **Bosques** (no lugar das florestas de coníferas): núcleos pequenos e médios, aglomerados na **borda oeste** (ecótono com o Carvalhal) e em **corredores ao longo do Avery e do rio de Orynth**. Não é uma floresta única: são manchas de 20 a 60 px.
2. **Campos abertos intencionais:** a maior parte da pegada fica **aberta** [MAPA, recortes], com árvores isoladas (retardatárias) em poucos pontos. A "clareira" de Terrasen vira o **fundo** da composição. A variação de cor do chão (mosaico) entra no **raster**, não no SVG.
3. **Colinas em ondulação:** poucas cadeias suaves (no máximo 3 ou 4), no centro-oeste, onde o impresso e o relevo gerado sugerem elevação; **sem neve e sem montanhas**.
4. **Junco e areia** na costa leste e na foz do Avery (acabamento da costa aprovada; a costa não muda).
5. **Garantias por construção** (herdadas): só em terra, só dentro do peso de Adarlan, a ≥ 30 px dos ícones, fora do retângulo do rótulo, a ≥ 14 px de água, ≥ 13 px das rotas, sem consumir o aleatório compartilhado.

**Faixas de transição declaradas** (dono, largura, orçamento):

| Fronteira | Dono | Largura proposta | Regra |
|---|---|---|---|
| Terrasen → Adarlan (norte, `y ≈ 0,20–0,27`) | Terrasen até `y 0,22`; Adarlan depois | 0,05 | **ecótono misto:** a probabilidade de conífera cai de 1 para 0 enquanto a de folhosa sobe de 0 para 1; densidade ≥ 6 por 10 mil px² na faixa (hoje 2,7); ΔE de cor ≤ 6 por 0,03. **Terrasen não muda** (R1/R2) |
| Adarlan ↔ Floresta Carvalhal (oeste) | Carvalhal é `r04`, ainda **não refinado** | 0,04 | a borda de Adarlan diminui a densidade até o estilo padrão; risco de **salto de linguagem** (símbolo novo ao lado de árvore redonda antiga); ver decisão 6 |
| Adarlan ↔ Melisande / Eyllwe (sul) | planejadores padrão | n/a | corrigido pela **paleta** (ΔE de 5 a 7 para 15 a 16) |
| Costa (leste) | geografia aprovada | n/a | só areia e junco |

## 7. Desempenho e zoom

Estimativa (não medida, pois não há protótipo): 110 a 140 símbolos × ≈ 13 caminhos por símbolo [MEDIDO em Terrasen: 2.020 caminhos / 151 símbolos] = **1.500 a 1.900 caminhos**, **≈ 200 a 250 KB por modo**, somados aos 255 KB de Terrasen. Dentro da faixa medida na escala sintética (pan sem degradação até 24 mil caminhos; ver a seção 3 da consolidação). O custo de planejamento é de dezenas de milissegundos. O mosaico de campos no raster custa pixels, não nós de DOM. **Pendente:** medir em celular.

## 8. Conformidade com as restrições

| Restrição | Situação prevista |
|---|---|
| Não alterar costa, rios, lagos | **sem alteração.** Testes existentes (impressão digital da costa `9e05e5c1`) + R4/R5 |
| Não mover cidades, marcadores ou rotas | **sem alteração**; símbolos ficam a ≥ 30 px dos marcadores |
| Não alterar a interface | **sem alteração** além de um parâmetro de URL oculto (`?adarlan=`) |
| Não modificar outros biomas | Terrasen: **intocada** (valores mestre). Carvalhal, Melisande, Eyllwe etc.: só a **mistura natural de cor** nas bordas, medida |
| Não introduzir elementos geográficos sem evidência | campos, bosques e colinas são vegetação/relevo suave [ARTE]; **nenhuma estrada, rio, lago ou lugar é criado** |
| Sépia coerente com o colorido | corrigido: o sépia passa a consultar o peso de Adarlan (0 montanhas) |
| Limites artísticos × geográficos | as zonas `r05-*` e o novo `adarlan-arte.json` são **artísticos**; mudá-los não toca na geografia |

## 9. Decisões: situação após a revisão (2026-11-25)

Resolvidas na direção preliminar: 1 (escopo: manter a pegada), 2 (folhosas), 3 (testar mosaicos no raster, sem sebes), 4 (colinas suaves, condicionadas ao relevo), 5 (só o marcador), 6 (aceitar o salto de linguagem), 7 (A em cor, B em sépia; três paletas). **Ainda abertas:** 8 (mapa impresso) e 9 (cânone). Texto original abaixo, para referência.

1. **Escopo.** (a) Só a pegada atual (planície central e costa de Rifthold), ou (b) estender as zonas artísticas para que **Perranth, Endovier, Meah e Anielle** caiam em Adarlan (altera `biomas.json`, que é artístico, não geográfico). Recomendo **(a) agora** e (b) como segunda etapa, porque Perranth e Endovier são ecótonos com Terrasen e o Carvalhal.
2. **Espécie.** Folhosas (carvalhos) em Adarlan, com conífera só no ecótono de Terrasen. Confirma?
3. **Campos agrícolas.** Mosaico de campos no chão (raster) e, opcionalmente, sebes em vetor: sim ou não? Risco: regularidade artificial; proponho parcelas irregulares e sem linhas retas.
4. **Colinas:** trocar os 24 arcos por 3 ou 4 cadeias em ondulação (sim/não).
5. **Rifthold:** um símbolo urbano (mancha/silhueta de cidade) além do marcador, ou só o marcador?
6. **Fronteira com o Carvalhal.** Como Carvalhal ainda é padrão, o estilo novo de Adarlan fica ao lado de árvore redonda antiga. Opções: (a) aceitar o salto até refinar o Carvalhal (recomendado como **próximo** bioma), (b) suavizar a borda de Adarlan para o estilo antigo.
7. **Estilos:** A em cor e B no sépia (como Terrasen)? E a paleta da seção 4, provisória?
8. **Leitura do impresso.** Reenvie o mapa impresso (ou salve em `referencia-local/`) para eu ler bosques, rios e limites de Adarlan com grade, como fiz em Terrasen.
9. **Conferência do cânone.** Os itens marcados [CÂNONE a conferir] (Endovier, Perranth, Meah, Anielle em Adarlan; estradas; relevo da planície) vêm da minha memória.

## 10. Próximos passos, se você aprovar

0. **Consolidação** ([CONSOLIDACAO-TECNICA.md](../CONSOLIDACAO-TECNICA.md)), com portão de valores mestre.
1. Dados: `adarlan-arte.json` (bosques, corredores, colinas, ecótonos) lidos do impresso, marcados [MAPA]/[ARTE].
2. Protótipo **desligado por padrão** (`?adarlan=A|B|C|AB`), em branch própria (`bioma-adarlan`), com o sépia consultando o peso de Adarlan.
3. Comparações (cor e sépia, visão geral e zoom máximo, atual × proposto), medidas e testes; **sem merge sem sua aprovação**.
4. Refinamento visual, aprovação, merge; só depois, atualizar a demo.

**Critérios de aceitação (propostos):** (1) ΔE ≥ 12 contra cada vizinho; (2) contraste copa × chão ≥ 3; (3) Clark-Evans ≤ 1,10 nos campos e variância/média > 1,6 na pegada; (4) CV de tamanho > 0,2; (5) bosques sem vazio > 70 px e campos abertos ≤ 160 px; (6) **0 montanhas** nos dois modos; (7) densidade ≥ 6 na faixa de transição com Terrasen; (8) **0 pixels diferentes** além de 1,6 vezes o raio das zonas e **0 no interior de Terrasen**; (9) valores mestre de Terrasen iguais; (10) ≤ +10% de tempo de renderização; (11) 0 símbolos duplicados e alinhamento 0 px na camada vetorial; (12) símbolos nítidos no zoom máximo.
