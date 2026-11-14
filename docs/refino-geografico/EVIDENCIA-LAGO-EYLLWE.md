# Evidência do lago ao norte de Eyllwe (classificado como alta confiança)

**Referência visual:** a comparação lado a lado com o mapa impresso fica só **local**
(`referencia-local/referencia-impresso-vs-nosso.png`, fora do Git e do GitHub), porque contém o mapa impresso e este
repositório é público. Este documento descreve o que ela mostra.

## O que se vê no impresso

- Um **contorno fechado**, em **traço duplo** (duas linhas paralelas muito próximas), igual ao traço usado em outros
  lagos do mapa e diferente do traço de estrada (pontilhado) e de fronteira.
- **Formato:** largo em cima, com o lado direito quase reto, e uma ponta arredondada embaixo à direita. Não é uma elipse.
- **Tamanho:** ≈ 0,041 × 0,080 do mapa (≈ 98 × 135 px na nossa escala), ou seja, ≈ 30 × 43 px na digitalização de
  736 px. É grande demais para ser mancha do papel ou defeito de impressão.
- **Entorno:** o ponto de Calacúlia fica abaixo, a floresta escura a oeste e uma estrada pontilhada passa ao norte.

## Por que é "alta" confiança

1. O contorno é **inteiramente fechado**, sem lacunas.
2. O traço duplo é **o mesmo** dos demais corpos de água do mapa.
3. O tamanho é **muito maior** que o ruído da digitalização.
4. Foi lido **duas vezes de forma independente** (centro e topo em recortes diferentes) e as leituras coincidiram.

## Como o formato foi obtido

A primeira versão era uma **elipse**. A comparação com o impresso mostrou que **posição e tamanho estavam certos, mas
o formato não**. O contorno atual (26 vértices, em `hidrografia.json`, campo `contorno`) foi lido sobre uma **grade de
coordenadas** colocada em cima do impresso (precisão de ±0,003 do mapa) e desenhado por uma spline fechada, **sem
nenhuma perturbação inventada**. O teste `hidrografia.test.ts` exige que a forma desenhada nunca se afaste mais de
6 px desse contorno e que o topo seja mais largo que a ponta.

## O que a evidência NÃO sustenta

- **Nome:** o rótulo, se existe, não é legível. Nenhum nome é atribuído.
- **Ligações:** nenhuma linha de rio entra ou sai do lago de forma clara. O curso "Avery para o sul", que parece
  tocar o topo do lago, está **pendente** e **não** é desenhado.
- **Detalhes internos:** o impresso tem uma linha interna dupla; ela é só a segunda linha do traço duplo.
- **Precisão:** ±0,003 no contorno e ±0,01 na posição geral, por causa da resolução da digitalização.
