# Planejamento da hidrografia (lagos e cursos de água)

**Status:** planejamento. Nada disto está implementado. Só entra depois da geografia (v3) ser aprovada.

**Regra de ouro (decisão da autora):** não inventar nomes, formatos nem conexões. Cada elemento abaixo foi
lido de uma digitalização de 736 px do mapa impresso, então **toda posição tem incerteza de ±0,01 do mapa**
(≈ 24 px na largura) e é marcada com um grau de confiança. Onde não dá para afirmar, o plano diz que não dá.

Coordenadas normalizadas (0 a 1), contadas do canto superior esquerdo, no mesmo sistema de `lugares.json`.

## 1. Elementos pedidos

| # | Elemento | Centro (x, y) | Tamanho aprox. | Confiança | Observações |
|---|---|---|---|---|---|
| 1 | **Lago ao norte de Eyllwe** | 0,775 · 0,698 | 0,043 × 0,083 (alto), em folha, inclinado | alta | É um contorno fechado. Uma estrada pontilhada passa ao norte dele. O rótulo, se existe, não é legível. |
| 2 | **Lago de Perranth** | 0,722 · 0,226 | 0,031 × 0,031 | alta | Contorno fechado ao lado do ponto de Perranth (0,709 · 0,247). Do lado leste dele sai uma linha de água que corre para leste (ver 7). |
| 3 | **Lago de Orynth** | ≈ 0,757 · 0,17 | ≈ 0,02 | **baixa** | Existe uma mancha clara logo abaixo do rótulo de Orynth, mas na digitalização **não consigo distinguir de uma mancha do papel**. Pedido: a autora confirma no impresso se há um lago ali. Até lá, não entra. |
| 4 | **Lago de Anielle** | 0,646 · 0,457 | 0,022 × 0,019, alongado NE-SO | média | Fica a nordeste do ponto de Anielle (0,65 · 0,473). O rótulo ("Lago ...") não é legível, então **não recebe nome**. |
| 5 | **Curso sinuoso de Melisande** | 0,607 · 0,67 | laço de ≈ 0,05 × 0,05 | média | Um gancho em forma de "G" perto da costa oeste de Melisande. Parece nascer na costa. Não é possível afirmar se tem outra ponta. |
| 6 | **Afluentes do Pântano de Pedra** | 0,60 a 0,70 · 0,71 a 0,84 | rede de ≈ 6 ramos | média | Rede dendrítica: ramos que vêm do noroeste e convergem para o pântano, mais um lago pequeno em 0,677 · 0,80 (0,026 × 0,037). Os ramos serão registrados **só onde a linha é visível**. |

## 2. Elementos visíveis no impresso que **não** estavam na lista (peço decisão)

| # | Elemento | Onde | Observação |
|---|---|---|---|
| 7 | Rio que sai de Orynth e do lago de Perranth | de Orynth (0,746 · 0,159) para sudeste até a costa em ≈ 0,813 · 0,238 | Duas linhas de água se encontram perto da costa. |
| 8 | Rio comprido do Avery para o sul | do Avery, passando ao lado de Morath, até o lago de Eyllwe | Dá a impressão de unir o Avery ao lago 1, mas **a conexão não é nítida**. Não vou assumir. |
| 9 | Linha vertical a oeste do lago de Eyllwe | x ≈ 0,696, de y 0,68 a 0,83 | Pode ser rio ou limite da floresta. Dúvida. |
| 10 | Linha ao longo do Desfiladeiro de Ferro | de Ruhnn ao cruzamento do Avery | Pode ser rio, estrada ou limite. Dúvida. |

Sem decisão da autora, **os itens 3, 7, 8, 9 e 10 não entram**.

## 3. O que já existe e muda

- **Avery** (rotulado no impresso): permanece como está.
- **`melisande-1`** (curso gerado, hoje traçado automaticamente): será **substituído** pelo item 5, desenhado
  por pontos de passagem lidos do impresso. O traçado automático sai.
- Nenhum rio ou lago recebe nome além do Avery.

## 4. Modelo de dados proposto

Um arquivo novo, `src/data/hidrografia.json`, separado de `biomas.json`:

```json
{
  "lagos": [
    { "id": "lago-eyllwe-norte", "centro": [0.775, 0.698], "raio": [0.021, 0.041], "rot": -0.3,
      "ref": "contorno fechado ao norte de Eyllwe", "confianca": "alta", "nome": null }
  ],
  "rios": [
    { "id": "melisande-curso", "pontos": [[0.58, 0.655], [0.585, 0.675]],
      "ref": "gancho junto à costa oeste de Melisande", "confianca": "media", "nome": null }
  ]
}
```

- `nome` é sempre `null` até haver confirmação.
- `confianca` ("alta", "media", "baixa") decide o que entra: **"baixa" nunca entra sem confirmação**.
- Lagos são **uma camada por cima da terra**, não mudam a elevação. Assim `encontrarLagos` continua
  exigindo zero água isolada na geografia (o que a v2 e a v3 garantem), e os lagos declarados ficam à parte.

## 5. Renderização (quando chegar a hora)

- **Lagos:** polígono orgânico (elipse com raio perturbado por ruído, determinístico), preenchimento com o
  azul dos rios, contorno em sépia `#40382D` (mesmo traço da costa), com a leve faixa de margem clara.
- **Rios:** a mesma rotina de pontos de passagem do Avery (spline Catmull-Rom), com largura que cresce
  rio abaixo. **Sem ramificações extras além das lidas.**
- Nada disso aparece no modo Sépia? Decisão a tomar: o modo clássico poderia desenhar os mesmos
  rios e lagos em tinta, sem cor.

## 6. Testes propostos

1. Todo lago fica inteiro em terra, a pelo menos 25 px da costa, e lagos não se sobrepõem.
2. Todo rio nasce em terra e termina no mar, **ou** num lago declarado, **ou** numa junção declarada.
3. Nenhum elemento com `confianca: "baixa"` é desenhado.
4. Nenhum elemento exceto o Avery tem `nome`.
5. Nenhum rio ou lago fica a menos de 25 px de um marcador de lugar sem ser o caso previsto
   (por exemplo, o lago de Anielle e o ponto de Anielle).
6. A hidrografia declarada coincide com a lista aprovada (ids fixos), para que nada seja acrescentado
   sem aprovação.

## 7. Ordem de trabalho

1. Autora decide os itens 3, 7, 8, 9 e 10.
2. Recorte ampliado de cada elemento aprovado e leitura dos pontos, com a autora conferindo.
3. `hidrografia.json` + testes de dados.
4. Renderização dos lagos e dos rios.
5. Comparação visual com o impresso e ajuste.

## 8. Riscos

- **Resolução da digitalização.** Uma foto em maior resolução das regiões de Orynth/Perranth, de Anielle e do
  Pântano de Pedra melhoraria muito a precisão dos itens 3, 4 e 6.
- **A costa muda a relação com a água.** O lago de Eyllwe e a rede do Pântano de Pedra ficam perto do litoral
  sul. O validador de geografia garantirá a margem de 25 px.
