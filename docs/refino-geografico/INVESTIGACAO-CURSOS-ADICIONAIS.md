# Investigação dos quatro cursos de água adicionais

**Status:** investigação. **Nada disto está desenhado.** Os cinco elementos estão em
`src/data/hidrografia.json` como `candidatos` com `status: "aguardando-decisao"`, e há testes que impedem
qualquer um deles de ser desenhado antes da aprovação.

**Método:** cada região do mapa impresso foi ampliada de 7× a 9× (digitalização de 736 px, então toda posição tem
incerteza de ±0,01 do mapa, ≈ 24 px). Os cursos foram colocados sobre a geografia aprovada (v3) e medidos por
código, não só a olho. Coordenadas normalizadas (0 a 1), contadas do canto superior esquerdo.

## Achado principal

Os quatro **não são linhas soltas**. Juntos com o Avery e o lago de Perranth, formam **uma rede de água ligada por
junções visíveis** no impresso. Por isso cada ligação abaixo recebe a sua própria nota de evidência. Nenhuma ligação
será desenhada sem aprovação.

## Resumo

| # | Curso | Confiança | Conflito com a geografia aprovada |
|---|---|---|---|
| 7 | Rio de Orynth (+ saída do lago de Perranth) | **alta** (rio) · média (saída) | nenhum |
| 8 | Avery para o sul, até o lago de Eyllwe | **média** | passa a 2 px do marcador de Morath |
| 9 | Tronco do Pântano de Pedra | **média** | nenhum |
| 10 | Linha do Desfiladeiro de Ferro | **média** | nenhum |

## 7. Rio de Orynth e saída do lago de Perranth

- **Posição aproximada:** faixa de (0,739; 0,158) a (0,815; 0,241), a nordeste do continente.
- **Origem e destino aparentes:**
  - *Rio de Orynth:* nasce **no ponto de Orynth** (0,746; 0,158) e desce para sudeste até a costa, em ≈ (0,815; 0,241).
  - *Saída do lago de Perranth:* sai da ponta leste do lago (0,739; 0,233), corre para leste e se junta ao rio de Orynth perto da costa, em ≈ (0,81; 0,239).
- **Evidência visual:**
  - O rio de Orynth é uma **linha dupla contínua** (traço de rio, o mesmo da margem de lagos), com cerca de 0,1 de comprimento, que sai do ponto da cidade e termina na costa.
  - A saída do lago é uma **linha simples e fina**, que parte da borda do lago e encontra o rio numa junção visível. A espessura menor sugere um riacho, mas não dá para afirmar.
- **Grau de confiança:** rio de Orynth **alta**; saída do lago **média**; ligação lago → riacho **média-alta**; ligação riacho → rio **média-alta**.
- **Conflitos com a geografia aprovada:**
  - Nenhum ponto cai na água.
  - A foz do rio de Orynth cai a **4 px da costa da v3**: a costa aprovada concorda com o impresso nessa região.
  - O rio nasce a 4 px do marcador de Orynth. Isso é justificado, pois a nascente é a própria cidade.
  - A rota "De Anielle a Orynth" foi desviada para o oeste do lago de Perranth; se este rio entrar, é preciso conferir que ela não o cruza.
- **Não presumido:** que o riacho seja de fato a saída do lago (a linha toca o lago, mas não dá para ver o sentido da água).

## 8. Avery para o sul, até o lago ao norte de Eyllwe

- **Posição aproximada:** de (0,741; 0,480) a (0,754; 0,657), passando por Morath (0,688; 0,561).
- **Origem e destino aparentes:**
  - Origem: a **junção do Avery a oeste do Forte da Fenda**, onde três linhas se encontram: a que segue para o Forte (a rotulada "Rio Avery"), a do ramo noroeste e esta.
  - Destino: o **topo do lago ao norte de Eyllwe**.
- **Evidência visual:** linha dupla contínua, de ≈ 0,19 de comprimento, que sai da junção para oeste-sudoeste, desce junto a Morath e corre para sudeste ao longo da borda da floresta até tocar a ponta norte do lago de Eyllwe. O estilo é o mesmo do Avery.
- **Grau de confiança:** curso **média**; junção com o Avery **média-alta**; chegada ao lago **média-baixa** (as linhas se tocam, mas o encontro é pequeno).
- **Conflitos com a geografia aprovada:**
  - Nenhum ponto cai na água.
  - O curso passa a **2 px do marcador de Morath**. No impresso o ponto de Morath fica colado ao rio, mas o nosso ícone tem 34 px e cobriria o curso. Seria preciso desviar o ícone ou marcar Morath como "ribeirinho"; não vou mover nenhum lugar.
  - A borda da floresta é a mesma faixa do bioma de floresta central; os símbolos terão de se afastar.
- **Não presumido:** que o rio **deságue** no lago (pode só passar rente a ele).

## 9. Tronco do Pântano de Pedra (a "linha vertical" a oeste do lago de Eyllwe)

- **Posição aproximada:** de (0,674; 0,680) a (0,695; 0,831).
- **Origem e destino aparentes:**
  - Origem: perto do cruzamento da borda pontilhada, ao sul de Melisande. **A origem é pouco nítida.**
  - Destino: a **confluência da rede do Pântano de Pedra**, em ≈ (0,695; 0,831), onde chegam também os afluentes.
- **Evidência visual:** linha dupla, igual à dos afluentes, que desce rente à face oeste e sul da floresta até a confluência. **Não está isolada:** as linhas dos afluentes e a dela terminam no mesmo ponto.
- **Grau de confiança:** curso **média-alta** (não há dúvida de que é a mesma classe de traço); origem **baixa**; confluência com os afluentes **alta**; para onde a água sai depois da confluência **baixa** (as linhas continuam para a direita e para baixo).
- **Conflitos com a geografia aprovada:**
  - Nenhum ponto cai na água.
  - **Dependência:** os três afluentes do planejamento original (ramos A, B e C) só têm uma foz justificável se este tronco existir, pois todos terminam na mesma confluência. Sem o tronco, eles ficariam com o fim sem justificativa. Por isso, mesmo no nível "média", eles **não são desenhados** (há um teste para isso).
- **Não presumido:** a origem do tronco e o destino depois da confluência.

## 10. Linha do Desfiladeiro de Ferro

- **Posição aproximada:** de (0,631; 0,328) a (0,700; 0,439), junto às Montanhas Ruhnn.
- **Origem e destino aparentes:**
  - Origem: logo abaixo do rótulo da **Mina de Sal de Endovier**, entre as montanhas.
  - Destino: a **junção a oeste da Floresta Carvalhal**, onde começa o ramo noroeste do Avery (0,676; 0,431).
- **Evidência visual:** linha dupla contínua de ≈ 0,15 de comprimento, paralela ao rótulo "O Desfiladeiro de Ferro", que desce para sudeste até a junção e segue para leste. Na mesma junção há uma linha curta que toca o **lago de Anielle**.
- **Grau de confiança:** **média**. Pode ser rio, estrada ou o fundo do desfiladeiro desenhado como curso. O que pesa a favor de rio é o estilo de linha dupla, igual ao do Avery. O ramo noroeste do Avery que já existe no mapa **coincide** com o trecho final desta linha, então os dois já se sobrepõem em parte.
- **Conflitos com a geografia aprovada:**
  - Nenhum ponto cai na água.
  - **Sobreposição parcial** com o Avery já desenhado, que teria de ser unificado em um só curso.
  - O traço cruza a região de montanhas (Ruhnn): os símbolos de montanha se afastariam do curso.
- **Não presumido:** que a linha seja rio, e que a linha curta ao lago de Anielle seja uma ligação de água.

## Pergunta a você, por item

| # | Posso incluir? | Observação |
|---|---|---|
| 7 | rio de Orynth: sim sugerido; saída do lago: decida | o rio é o que tem mais evidência de todos |
| 8 | decida | depende de como tratar Morath |
| 9 | decida | é pré-requisito dos afluentes do Pântano |
| 10 | decida | é o de maior dúvida sobre ser rio |
