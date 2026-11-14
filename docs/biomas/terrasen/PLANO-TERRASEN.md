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
| Pixels diferentes **fora** de Terrasen | — | **0** (cor e sépia, três estilos) |

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
| Pixels diferentes fora de Terrasen | — | **0** |

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
| Não alterar costa, rios ou lagos | **cumprido.** A impressão digital da costa continua verificada por teste; 0 pixels diferentes fora de Terrasen |
| Não mover cidades, marcadores ou rotas | **cumprido.** Nenhum dado de lugar ou rota foi tocado; símbolos ficam a ≥ 26 px dos marcadores |
| Não alterar a interface | **cumprido.** Nenhum componente visível mudou. Existe um parâmetro de URL oculto (`?terrasen=`) e o encanamento da cache em `MapaView.vue` |
| Não modificar outros biomas | **cumprido.** Um teste exige que todas as zonas fora de `r03-*` sejam idênticas às originais |
| Não introduzir elementos geográficos sem evidência | **cumprido.** Clareiras e massas são vegetação (classificadas [ARTE]); nenhum lago, rio ou lugar foi criado |
| Sépia funcional e coerente | **cumprido** nos três estilos ([comparação](5-comparacao-sepia.png)) |

Testes: 118 passam (105 anteriores + 13 do protótipo) e o build passa.

**Limite honesto:** a cor se mistura suavemente entre zonas vizinhas. Por isso a cor nova de Terrasen "vaza" um pouco
para as bordas vizinhas, o que é desejável e é a transição. **Não medi** a largura exata desse vazamento: pelo alcance da mistura
(1,25 × o raio de cada zona) deve ficar em torno de 0,04 do mapa. Fora da caixa de Terrasen (x ≥ 0,46, y ≤ 0,38), 0 pixels mudam.

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

**Critérios de aceitação:** coníferas ≥ 150, VMR > 1,6, nenhum vazio > 100 px, 0 pixels alterados fora do bioma, ΔE ≥ 12
contra cada vizinho, ≤ +10% de tempo de renderização, e símbolos nítidos em zoom máximo.

## Como ver o protótipo

`npm run dev` e abra, por exemplo, `?livro=7&lang=pt&terrasen=A` (ou `B`, `C`; acrescente `&estilo=classico` para o sépia).
Sem o parâmetro, o mapa é exatamente o aprovado.
