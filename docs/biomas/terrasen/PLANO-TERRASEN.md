# Terrasen, região-piloto: diagnóstico, plano técnico e proposta visual

**Status:** diagnóstico e **proposta**. Nada disto está mesclado. A branch `bioma-terrasen` parte da `v1.0.0` aprovada e
traz um **protótipo desligado por padrão** (`?terrasen=A`, `B` ou `C`) só para tornar a proposta visível e medir o custo
real. Sem esse parâmetro, o mapa é idêntico ao aprovado.

**Referências usadas:** o guia de direção de arte (paletas e símbolos) e o mapa impresso, apenas como evidência de
posição e de classificação. Os dados canônicos citados vêm da **minha memória dos livros e precisam da sua conferência**;
estão marcados.

Legenda das classificações: **[MAPA]** visto no mapa impresso · **[CÂNONE]** dos livros (a conferir) · **[ARTE]**
interpretação artística (do guia ou nossa).

## 0. Resultado em uma tabela

| | Hoje | Protótipo (calibragem A3) |
|---|---|---|
| Símbolos em Terrasen | 121–137 (≈ 7–8 por 10 mil px²) | 265 (≈ 15 por 10 mil px²) |
| Coníferas | 79–95 | 213 |
| Montanhas | 34–44 | 52 (37 na zona norte, em cumeeiras) |
| Agrupamento (variância/média por quadrante) | 1,2–1,35 (quase aleatório) | **2,35** (massas e clareiras projetadas) |
| Vazios | até 178–188 px, aleatórios | até 71 px, **são clareiras** |
| Variação de tamanho das coníferas (CV) | 0,11 | > 0,2 |
| Neve nas montanhas | 100% | só nos picos altos (16 de 52) |
| ΔE pinhal × Selva vizinha | 7,4 (indistinguível) | 16,8 |
| Tempo de renderização (cor) | 1744–1837 ms | 1725–1878 ms (dentro do ruído) |
| Pixels diferentes além de 1,6 × o raio das zonas de Terrasen | — | **0** (cor, rodada 2). Veja a correção na seção 8 e o alcance real na seção 11 |

Comparações visuais: [cor](4-comparacao-cor.png), [sépia](5-comparacao-sepia.png), [zoom máximo](6-zoom-maximo.png).

## 1. Como Terrasen é representada hoje

Três zonas (`biomas.json`, ids `r03-*`), todas elipses com borda deformada por ruído:

| Zona | Cor do chão | Símbolos | Neve |
|---|---|---|---|
| `r03-terrasen` | `#4D7255` (musgo) | conífera 0,55 · montanha 0,5 · árvore 0,08 | sim |
| `r03-pinhal-denso` | `#254B3C` (pinho) | conífera 0,85 | não |
| `r03-montanhas-norte` | `#7B806E` | montanha 0,9 | sim |

**Cores.** A cor média realmente renderizada em Terrasen é `#52674E`, mais clara e amarelada que o verde-pinho do guia.
O símbolo de conífera (`#254B3C`) sobre esse chão tem contraste de **1,6 a 1,8**: fraco, por isso os pinheiros somem.

**Densidade.** 7–8 símbolos por 10 mil px². Um "pinhal denso" teria vizinhos quase se tocando; hoje o vizinho mais próximo
fica a ≈ 19 px, para árvores de ≈ 10 px de meia largura.

**Montanhas.** Um único desenho (triângulo, face direita sombreada, boné de neve), tamanho entre 11 e 21 px. A neve é uma
bandeira da **zona** inteira: **100%** das montanhas de Terrasen têm neve, inclusive as da base.

**Clareiras.** Não existem projetadas. Existem vazios aleatórios (de até ≈ 180 px de raio) que parecem esquecimento.

**Transições.** A cor mistura as zonas com suavidade, mas a escolha dos símbolos usa só a zona dominante. Onde nenhuma
zona passa de 0,3 de peso, o gerador cai no bioma "padrão" (esparso), o que abre uma **faixa rala de 20 a 30%** na
fronteira. Veja a [análise anotada](1-diagnostico-atual-anotado.png).

## 2. Canônico × interpretação

| Ponto | Classificação | Observação |
|---|---|---|
| Terrasen é o reino do norte; capital Orynth | [MAPA] [CÂNONE] | rótulo no norte, Orynth na costa leste da região |
| Clima frio | [CÂNONE] [ARTE] | base da paleta fria e da neve |
| Cordilheiras ao longo da borda norte e noroeste | [MAPA] | fileiras de montanhas junto aos rótulos "Tribo dos Lobos" e "Montanhas Galhadas do …" (o final do nome é de leitura duvidosa) |
| Cordilheira perto de Orynth (Staghorn) | [CÂNONE] *(a conferir)* | memória dos livros; o nome em PT precisa ser confirmado |
| **Massa florestal escura a sudoeste de Orynth** | [MAPA] | é a grande mancha pontilhada rotulada "Floresta **Carvalhal**", fora da zona `r03` |
| **Oakwald é de carvalhos (folhosas)** | [CÂNONE] *(a conferir)* | **entra em conflito com o "pinhal denso" do guia** |
| Pinheiros densos cobrindo Terrasen | [ARTE] do guia | **não** aparece no impresso e, pelo que lembro, não é característica canônica |
| Leste de Orynth aberto, com rio | [MAPA] | pergaminho vazio com rios: apoia campo aberto e clareiras ali |
| Neve só nos picos altos | [ARTE] | coerente com o frio; hoje a neve é indiscriminada |

**A decisão mais importante do plano** é a segunda linha em negrito: o canônico sugere folhosas no Oakwald, e o guia
manda coníferas para Terrasen. O protótipo segue o guia (coníferas) **porque é o pedido**, mas isso precisa da sua
confirmação (pergunta 1 na seção 9).

## 3. Padrões artificiais identificados

1. **Sal e pimenta:** coníferas soltas, uma a uma, sem massa. É o defeito central.
2. **Tamanho quase uniforme:** coníferas de 8 a 12 px (CV 0,11); montanhas de 11 a 21 px.
3. **Um só desenho** de conífera e um só de montanha: o olho percebe a repetição em segundos.
4. **Neve em tudo**, sem relação com altitude.
5. **Sem cumeeiras:** as montanhas se agrupam por ruído, não formam cadeias alinhadas.
6. **Vazios sem intenção** e **faixa rala** nas fronteiras.
7. **Contraste fraco** entre símbolo e chão, e cores de Terrasen quase iguais às das florestas vizinhas (ΔE 7–8).

Observação sobre a medição: a primeira versão deste diagnóstico falava em "distribuição uniforme". As medições
mostraram que não é bem isso: o índice de Clark-Evans é 1,02 a 1,03 (essencialmente aleatório) e o agrupamento leve
(1,2 a 1,35) vem do ruído, não de um projeto. O defeito é a **ausência de agrupamento projetado**.

## 4. Paleta proposta

Ver a [folha de paleta](2-paleta-proposta.png). Regra: **no máximo ΔE 12 em relação ao guia** (continua sendo o mesmo
espírito) e **o máximo possível de distância dos vizinhos**. ΔE ≥ 12 já se distingue; ≥ 15 com folga.

| Uso | Atual | Proposta | Justificativa |
|---|---|---|---|
| Floresta escura / copa | `#254B3C` | **`#1F4040`** | mais azulada e fria; ΔE do guia 11,0; **16,8** de Selva/Oakwald (antes 7,4) |
| Sub-bosque (sombra da massa) | — | `#173433` | sombra suave sob os núcleos; dá volume sem outro símbolo |
| Copa, face iluminada | — | `#3A6B62` | luz de noroeste, mesma família |
| Chão / musgo frio | `#4D7255` | **`#527A70`** | ΔE do guia 12,0; **12,5** dos vizinhos (antes 8,2) |
| Clareira (campo frio) | — | **`#8FAA9C`** | ≥ 16,9 de todos os vizinhos; contraste 4,3 com a copa |
| Transição ao sul (Adarlan) | — | `#66875F` | ΔE 15,3 de Adarlan: a borda lê como mudança |
| Rocha / luz / sombra | `#78878D` | `#78878D` / `#A9B7BC` / `#56646B` | rocha do guia + duas faces |
| Neve / sombra / brilho | `#DCE5E8` | `#DCE5E8` / `#B8C9D0` / `#EDF1EF` | do guia (Terrasen e região 01) |

**Achado sobre o próprio guia:** `#254B3C` (Terrasen) e `#285B49` (Selva) têm ΔE 7,4, e `#4D7255` e `#52664F` (Oakwald)
8,2. Nas duas fronteiras o olho não percebe a mudança. A paleta nova resolve isso mexendo só em Terrasen.

## 5. Três variações de símbolos

Ver a [folha de símbolos](3-simbolos-tres-variacoes.png), em cor e em sépia.

| | Conífera | Montanha | Caráter |
|---|---|---|---|
| **A** | pinheiro em camadas, metade iluminada | dois picos, faces facetadas, neve em zigue-zague | equilibrada, a mais próxima do que existe |
| **B** | abeto gravado, metade hachurada | cadeia serrilhada de dentes que compartilham a base | a mais "medieval ilustrada"; **a melhor no sépia** |
| **C** | copa **vista de cima** (agulhas) | massa rochosa arredondada, hachura vertical e estratos | a mais fiel à vista de cima, e a mais estilizada |

Todas têm **tamanho variável** (log-normal), pequena inclinação e **ordem por profundidade**. A neve só nos picos altos.

**Minha recomendação:** **A** como base ou **B** se você quiser o mapa mais gravado. A **C** é a mais ousada e pede mais
ajuste (as copas em estrela ficam muito escuras em massa).

## 6. Massas florestais, clareiras e transições sem mudar os limites

Tudo é gerado por campos de ruído de baixa frequência e **amostragem de ruído azul** (Poisson com raio variável), sem
mexer nos limites aprovados:

1. **Núcleos de floresta** (ruído de ~330 e ~150 px): onde o núcleo é forte, o raio mínimo entre árvores é pequeno (10,5 px)
   e as árvores são maiores (idade); na borda o raio sobe (até ≈ 32 px) e as árvores encolhem.
2. **Clareiras** (ruído de ~100 px): dentro dos núcleos a probabilidade cai a quase zero e uma **lavagem clara** (`#8FAA9C`)
   marca o campo; as massas ganham uma **lavagem escura** (`#173433`).
3. **Cumeeiras:** montanhas só onde a cumeeira do ruído (`1 − |n|`) passa do limiar; o tamanho cresce com a altura.
4. **Transição:** um peso suave (média de 17 amostras em dois raios, ≈ 48 px) em vez da zona dominante. Na borda
   há árvores isoladas ("retardatárias") e a cor faz a mistura. Isso elimina a faixa rala.
5. **Garantias por construção:** só em terra, só onde o peso de Terrasen é ≥ 0,12, a ≥ 26 px de qualquer marcador, a ≥ 8 px
   de lagos e rios, e **sem consumir o gerador aleatório compartilhado** (hash próprio), logo o resto do mapa não muda.

## 7. Desempenho e zoom

| Métrica | Atual | Protótipo A / B / C |
|---|---|---|
| Renderização, cor | 1744–1837 ms | 1725 / 1878 / 1829 ms |
| Renderização, sépia | 1408–1456 ms | 1530 / 1495 / 1514 ms |
| Símbolos em Terrasen | ≈ 125 | 265 |
| Pixels diferentes além de 1,6 × o raio das zonas | — | **0** (ver seção 11) |

O custo extra é **dentro do ruído de medição** (±5%): a renderização é dominada pelos 4 milhões de pixels do terreno, e
265 símbolos custam muito pouco.

**O problema real é a nitidez no zoom.** O mapa é uma imagem de 2400 px que o Leaflet amplia até 2,8× ([comparação](6-zoom-maximo.png)).
Isso já suaviza os símbolos de hoje; com símbolos de **tinta fina e hachuras**, o efeito aparece mais. Opções:

| Opção | Custo | Nitidez | Observação |
|---|---|---|---|
| a) manter o raster | zero | cai nos símbolos finos | aceitável só para o estilo A |
| b) **camada vetorial só dos símbolos de Terrasen** (canvas do Leaflet) | média | **perfeita em qualquer zoom** | ≈ 270 símbolos, trivial de desenhar; **recomendada** |
| c) overlay raster 2× só da caixa de Terrasen | baixa | boa até 2,8× | ≈ 1824 × 1008 px, +1–2 MB |
| d) pirâmide de tiles | alta | perfeita | exagero para uma região |

**Recomendação:** decidir primeiro o estilo; depois a opção **b**, que também serve de base para os demais biomas.

## 8. Conformidade com as restrições

| Restrição | Situação |
|---|---|
| Não alterar costa, rios ou lagos | **cumprido.** A impressão digital da costa continua verificada por teste; nenhum pixel difere além de 1,6 × o raio das zonas de Terrasen (medição na seção 11; a frase anterior "0 pixels fora de Terrasen" estava imprecisa e foi substituída) |
| Não mover cidades, marcadores ou rotas | **cumprido.** Nenhum dado de lugar ou rota foi tocado; símbolos ficam a ≥ 26 px dos marcadores |
| Não alterar a interface | **cumprido.** Nenhum componente visível mudou. Existe um parâmetro de URL oculto (`?terrasen=`) e o encanamento da cache em `MapaView.vue` |
| Não modificar outros biomas | **cumprido.** Um teste exige que todas as zonas fora de `r03-*` sejam idênticas às originais |
| Não introduzir elementos geográficos sem evidência | **cumprido.** Clareiras e massas são vegetação (classificadas [ARTE]); nenhum lago, rio ou lugar foi criado |
| Sépia funcional e coerente | **cumprido** nos três estilos ([comparação](5-comparacao-sepia.png)) |

Testes: 118 passam (105 anteriores + 13 do protótipo) e o build passa.

**Limite honesto:** a cor se mistura suavemente entre zonas vizinhas. Por isso a cor nova de Terrasen "vaza" um pouco
para as bordas vizinhas, o que é desejável e é a transição. **Correção (rodada 2):** na rodada 1 eu escrevi "0 pixels mudam fora de Terrasen". Isso só valia para uma caixa grande
(x ≥ 0,46, y ≤ 0,38), não para o contorno do bioma, e a largura do vazamento não tinha sido medida. Agora está medida (seção 11).

## 9. Decisões em aberto (preciso de você)

1. **Coníferas ou carvalhos?** O guia manda coníferas em Terrasen; o canônico (a conferir) sugere carvalhos no Oakwald.
   Posso manter coníferas, ou misturar folhosas no sul da região, junto à Floresta Carvalhal.
2. **Estilo:** A, B ou C (ou B no sépia e A em cor).
3. **Posição das cumeeiras.** Hoje elas ficam na zona `r03-montanhas-norte`, a noroeste. No impresso há fileiras de
   montanhas também **ao norte e perto de Orynth**. Alinhar isso exige **mexer na geometria das zonas** (`biomas.json`),
   o que é uma mudança de dados que não fiz.
4. **Quantidade de montanhas:** o protótipo tem 52 (hoje ≈ 38) e a cumeeira noroeste ficou pesada. Posso reduzir.
5. **Colinas de transição** (poucas, sem neve) entre a cumeeira e a floresta: incluir ou não.
6. **Técnica de zoom:** a opção **b** (vetorial) ou **c** (overlay 2×).

## 10. Próximos passos, se você aprovar

1. Fixar estilo, conífera × folhosa e quantidade de montanhas.
2. Mover o protótipo para o modelo de dados (`biomas.json` ganha parâmetros por zona) em vez de código fixo.
3. Camada vetorial dos símbolos (opção b), com o sépia como segundo modo de desenho.
4. Testes de aceitação: os mesmos dos protótipos, mais um teste de regressão pixel a pixel fora de Terrasen.
5. Replicar o sistema nos demais biomas, um por vez, com a mesma bateria de medidas.

**Critérios de aceitação:** coníferas ≥ 150, VMR > 1,6, nenhum vazio > 100 px, 0 pixels alterados além de 1,6 × o raio das zonas, ΔE ≥ 12
contra cada vizinho, ≤ +10% de tempo de renderização, e símbolos nítidos em zoom máximo.

## Como ver o protótipo

`npm run dev` e abra, por exemplo, `?livro=7&lang=pt&terrasen=A` (ou `B`, `C`; acrescente `&estilo=classico` para o sépia).
Sem o parâmetro, o mapa é exatamente o aprovado.

**Rodada 2:** `?terrasen=AB` = estilo A em cor e estilo B no sépia (decisão 1 da rodada 2).

---

# Rodada 2 (refinamento visual, ainda sem merge)

## 10b. Decisões artísticas aplicadas

1. Estilo **A** em cor, **B** no sépia (`?terrasen=AB`).
2. Só **coníferas** nas zonas de Terrasen (nenhum carvalho por proximidade com a Floresta Carvalhal).
3. Paleta da rodada 1 mantida, de forma provisória.
4. **Colinas de transição** sem neve nos sopés das cumeeiras; neve só nos picos altos.
5. Solução vetorial priorizada, **não implementada** de forma definitiva: só um experimento descartável (seção 12).

## 11. Validação técnica

### 11.1 Limites geográficos aprovados × limites artísticos

| | Limites **geográficos** (aprovados, imutáveis) | Limites **artísticos** (propostas, mutáveis) |
|---|---|---|
| O que são | costa, hidrografia (lagos e rios aprovados), posição dos lugares, rotas | elipses das zonas de bioma (`biomas.json`), cumeeiras e núcleos florestais (`terrasen-arte.json`) |
| Onde vivem | `geografia.ts`, `hidrografia.json`, `lugares.json`, `rotas.json` | `biomas.json`, `terrasen-arte.json`, `proto/terrasen.ts` |
| Mudou nesta rodada? | **Não** (impressão digital da costa 9e05e5c1 e dados protegidos intactos) | Sim, só `terrasen-arte.json` (novo) e o protótipo |
| Função | dizem **onde está a terra, a água e os lugares** | dizem **onde desenhar** montanha e floresta; podem ser trocados sem tocar na geografia |

O desenho é limitado pela geografia: símbolos ficam ≥ 14 px da água, ≥ 13 px das rotas e fora do ícone e do rótulo de cada lugar.

### 11.2 Alcance real das mudanças de cor (medição, cor, protótipo × atual)

229.732 pixels diferem; caixa normalizada [0,511; 0,010; 0,853; 0,277]. Por distância elíptica *d* até a zona `r03-*` mais próxima
(1 = borda da zona):

| Faixa | Pixels | Fortes (≥ 4/255) |
|---|---|---|
| d ≤ 1 (dentro) | 195.956 | — |
| 1 < d ≤ 1,25 | 28.137 | 19.607 |
| 1,25 < d ≤ 1,6 | 5.639 | 1.210 |
| d > 1,6 | **0** | **0** |

Maior diferença forte em d = 1,32; qualquer diferença até d = 1,45. No sépia: 71.239 pixels, todos em d ≤ 1,18.
Logo a transição de cor alcança até ≈ 0,45 vezes o raio da zona além da borda; é a mistura suave desejada, não um vazamento arbitrário.

### 11.3 Cumeeiras sobre o mapa impresso

Ver [figura 7](7-cumeeiras-atual-vs-refinado.png): a zona atual (`r03-montanhas-norte`) não cobre o maciço de Orynth; as quatro
cumeeiras lidas do impresso sim (noroeste, picos altos ao norte, maciço de Orynth, borda da floresta). A sobreposição ao impresso
fica em `referencia-local/` (ignorada pelo git, por ser material do livro).

### 11.4 Métricas anti-regularidade (testadas)

Quase-colinearidade comparada a um **modelo nulo aleatório** confinado à mesma faixa (não a um limiar arbitrário): coníferas
7% × 9% do aleatório; montanhas ≤ nulo + 0,04. VMR das coníferas 5,9 (> 1,6), CV de tamanho > 0,2, ≥ 4 clareiras, bosques > 8, nenhum vazio > 100 px.
Lavagem das clareiras: 0,42/0,28/0,20/0,12 comparadas ([figura 12](12-intensidade-da-lavagem.png)); **0,20** escolhida; 0,42 parece névoa.

### 11.5 Comparações finais

[Cor, visão geral](8-final-cor-visao-geral.png) · [sépia, visão geral](9-final-sepia-visao-geral.png) ·
[cor, zoom máximo](10-final-cor-zoom-maximo.png) · [sépia, zoom máximo](11-final-sepia-zoom-maximo.png).

## 12. Camada vetorial × raster no Leaflet (experimento)

Código descartável em `spikes/vetorial/` (`npm run dev`, `/spikes/vetorial/index.html`). Método: um `L.svgOverlay` com **exatamente os mesmos
limites** do `L.imageOverlay`; os glifos são gravados do **mesmo código de desenho do canvas** (`GravadorSvg`), de modo que raster e vetor não divergem.

| Verificação | Resultado |
|---|---|
| Alinhamento estático, zoom −1 a 1,5 | desvio máx. 0,32 a 0,67 px |
| Depois de pan curto e longo | 0,46 px (igual ao estático) |
| Durante a animação de zoom (52 quadros, largura 1697 → 6788 px) | desvio máx. **0,18 px**, 0 quadros > 1 px |
| Ordem de empilhamento | raster < SVG de símbolos < rota; SVG com `pointer-events: none` |
| Troca cor ↔ sépia, ingênua (`setUrl` + troca do SVG) | o SVG troca na hora e o raster só quando decodifica (19 ms no teste local); risco de um quadro incoerente |
| Troca com pré-carga (dois overlays decodificados, uma troca de `visibility` no mesmo quadro) | 0 de 21 quadros incoerentes |
| Pan, quadros de 16,67 ms | sem SVG: p95 17,1 ms; com SVG: p95 17,4 ms (sem perda) |
| Custo | 148 glifos = 1.352 `<path>`, 175 KB; renderizar os dois rasters = 4,4 s |
| Nitidez no zoom máximo | [raster](../../../spikes/vetorial/zoom-maximo-raster.png) × [vetor](../../../spikes/vetorial/zoom-maximo-vetor.png): o vetor mantém traço e hachura nítidos |

**Conclusão:** a sincronização é sólida porque o SVG usa os mesmos limites do raster e o Leaflet aplica a mesma transformação aos dois.
A troca cor ↔ sépia deve usar a **estratégia de pré-carga com `visibility`**, e o SVG de cada modo deve ser gerado do mesmo código do canvas.
Limites do gravador: não suporta `clip()` (estilo C usa); gradientes e sombras precisariam de suporte explícito.
Nenhuma dessas mudanças foi levada ao app na rodada 2.

---

# Rodada 3 (acabamento + camada vetorial experimental, ainda sem merge)

A direção artística da rodada 2 foi aprovada (A em cor, B no sépia, paleta fria, massas e clareiras, lavagem 0,20, quatro cumeeiras, colinas).
Esta rodada só faz o acabamento pedido e a versão experimental da camada vetorial. **A aprovação técnica abaixo não substitui a sua aprovação visual.**

## 13. Acabamento

| Item | O que mudou | Medição (rodada 2 → 3) |
|---|---|---|
| Maciço de Orynth | `escala` 0,84 e `tamMax` 24 no maciço; envelope das cumeeiras mais redondo; deriva suave de tamanho ao longo da cumeeira; vizinhos em três degraus (alto > médio > pequeno). Geometria das cumeeiras intacta; marcador de Orynth continua a ≥ 30 px de qualquer símbolo | maiores picos a nordeste de Orynth: 25,1 / 24,1 / 21,7 → 21,1 / 19,6 / 17,4 / 15,7 (cada um ≥ 80% do anterior); picos > 24 px no total: 6 → 4 |
| Florestas densas | contorno de separação (halo) sob cada conífera, escuro em cor e claro no sépia; espaçamento das massas +5% (`rConifBase` 11 → 11,5); ordem de desenho de trás para frente já garantida e agora testada | coníferas 115 → 111 (densidade mantida); pares de copas muito sobrepostas 3 → 3 (limite do teste: 6) |
| Montanhas B (sépia) | proporção (esbelta/larga, baixa/alta), inclinação do ápice (−0,4 a +0,25 da largura), densidade de hachuras e três composições (dois flancos, um flanco, ombro baixo), tudo derivado de `v` (determinístico) e dentro de limites | 60 amostras → ≥ 40 formas distintas; pico ≤ 1,75 × tam; nenhuma face fora da base |

O estilo A (cor) não foi redesenhado, exceto pelo halo das coníferas.

## 14. Camada vetorial experimental (no app, só com `?terrasen=`)

- Ligada por padrão com `?terrasen=...`; `&vetor=0` mantém os símbolos no raster (para comparar). Sem `?terrasen`, **nada muda** (caminho original, uma só imagem).
- Arquivos: `src/lib/proto/gravador-svg.ts` (grava o código de desenho do canvas em `<path>`), `camada-vetorial.ts` (um `<g>` por símbolo planejado), e as mudanças de `MapaView.vue`.
- O raster não desenha os símbolos de Terrasen no modo vetorial (as lavagens e os demais símbolos ficam), então **não há duplicação**.
- Cada modo tem seu par imagem + SVG, com `L.imageOverlay` e `L.svgOverlay` de **mesmos limites**. Os dois modos ficam decodificados; a troca decodifica e muda `visibility` dos quatro elementos no mesmo quadro.
- Painéis próprios (z-index 390 imagens, 395 símbolos) ficam abaixo do painel das rotas (400) e dos marcadores (600).

### Medições (Chrome, 1280 × 760, app real)

| Verificação | Resultado |
|---|---|
| Alinhamento SVG × imagem: visão geral e 6 níveis de zoom, após pan | desvio **0 px** em todos |
| Durante a animação de zoom (171 quadros, 3394 → 6788 px de largura) | desvio máx. **0 px**; 0 quadros > 1 px |
| Troca cor ↔ sépia (147 quadros amostrados em 4 trocas) | 0 quadros incoerentes, 0 quadros sem nada visível |
| Custo da primeira troca (renderiza o outro modo) | ≈ 2,2 s, atrás do aviso "pintando", como já era; trocas seguintes: só `visibility` |
| Pan, 153 quadros | raster: média 16,66 ms, p95 17,3 ms; vetor: 16,67 ms, p95 17,4 ms |
| Tempo até a imagem aparecer | sem Terrasen 2,8–4,2 s; Terrasen raster 2,6–2,7 s; Terrasen vetor 2,6–2,8 s (dentro do ruído) |
| Tamanho do SVG | 151 símbolos, 2.020 `<path>`, 255 KB por modo |
| Ordem das camadas | imagem 390 < símbolos 395 < rotas 400 < marcadores 600; `pointer-events: none` no SVG |
| Duplicação | com o SVG oculto, o raster do modo vetorial não contém símbolos de Terrasen; com o SVG visível, os pixels fora das caixas dos símbolos são idênticos (0 diferenças). Resíduo de 123 px de 478 mil (0,03%) é borda de halo na comparação com o raster que ainda os desenha |
| Erros no console | nenhum |

Diferenças visuais esperadas: o traço vetorial é nítido (o raster é suavizado em 2,8×) e, no sépia, o SVG fica **acima** da textura de envelhecimento, então os símbolos de Terrasen não recebem o envelhecimento do papel. Se isso incomodar, dá para aplicar um filtro/mistura no SVG.

Limites conhecidos: o gravador não suporta `clip()` (estilo C); a primeira troca de modo ainda renderiza o raster do outro modo de forma síncrona (já era assim). Ver [15 cor](15-r3-cor-raster-x-vetor.png) e [15 sépia](15-r3-sepia-raster-x-vetor.png).

## 15. Comparações da rodada 3

Rodada 2 × rodada 3: [cor, visão geral](13-r3-cor-visao-geral.png) · [sépia, visão geral](13-r3-sepia-visao-geral.png) · [cor, zoom máximo](14-r3-cor-zoom-maximo.png) · [sépia, zoom máximo](14-r3-sepia-zoom-maximo.png).
Raster × vetor (recorte ×3 no zoom máximo): [cor](15-r3-cor-raster-x-vetor.png) · [sépia](15-r3-sepia-raster-x-vetor.png).

Testes: 135 passam (124 anteriores + 11 de acabamento e vetor) e o build passa. Intocados e verificados: costa (impressão digital 9e05e5c1), hidrografia, lugares, rotas, outros biomas, interface visível.
