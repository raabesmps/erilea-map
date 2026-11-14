# Evidência do lago de Perranth (alta confiança, contorno lido)

**Referência visual:** a comparação com o mapa impresso fica só **local** (`referencia-local/`, fora do Git), porque
o repositório é público. As imagens em `docs/hidrografia/` mostram apenas o nosso mapa.

## O que se vê no impresso

- Um **contorno fechado em traço duplo**, quase circular, logo acima do ponto de Perranth. O ponto encosta no canto
  inferior esquerdo do lago.
- ≈ **0,030 × 0,030** do mapa (≈ 71 × 50 px na nossa escala).
- Pelo vértice direito encosta uma **linha fina** que segue para leste (a saída do lago). **Não é desenhada**: continua
  pendente (decisão da autora).

## Como o formato foi obtido

A primeira versão era uma elipse, ≈ 9% mais larga que o contorno impresso. O contorno atual (18 vértices, campo
`contorno` de `hidrografia.json`) foi lido sobre uma **grade de coordenadas** colocada em cima do impresso e desenhado
por uma spline fechada, sem perturbação inventada. Precisão: ±0,003 do mapa, exceto no lado esquerdo, misturado ao
hachurado das montanhas (±0,005).

## Garantias por teste

- A forma desenhada nunca se afasta mais de 6 px do contorno lido.
- Tamanho entre 0,026 e 0,034 de largura e 0,026 e 0,036 de altura.
- O marcador de Perranth continua **fora** da água, a 8 a 30 px da margem.
- A posição de Perranth (0,713; 0,245) não foi alterada.
- A saída do lago não é desenhada em nenhum nível.

## O que a evidência NÃO sustenta

Nome, conexão hidrográfica e a direção em que a água corre pela linha fina.
