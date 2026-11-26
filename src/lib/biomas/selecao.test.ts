import { describe, expect, it } from 'vitest'
import { TERRASEN } from '../proto/terrasen-bioma'
import { protoDe } from '../proto/terrasen'
import { SINTETICO } from '../../../tests/fixtures/bioma-sintetico'
import { algumVetorial, assinaturaDosAtivos, ativosDeProto, ativosDoEstado, normalizarBiomas } from './registro'

describe('seleção genérica dos biomas ativos (step 0d.2)', () => {
  it('?terrasen=A|B|C|AB ativam Terrasen com a mesma configuração de antes (protoDe), mais o modo vetorial', () => {
    for (const v of ['A', 'B', 'C', 'AB'] as const) {
      expect(ativosDoEstado({ terrasen: v }, { vetor: true })).toEqual([{ bioma: TERRASEN, config: { ...protoDe(v), vetorial: true } }])
      expect(ativosDoEstado({ terrasen: v }, { vetor: false })).toEqual([{ bioma: TERRASEN, config: { ...protoDe(v), vetorial: false } }])
    }
  })

  it('sem parâmetro, com valor vazio ou inválido, nada é ativado (o mapa padrão)', () => {
    for (const v of [undefined, null, '', 'off', 'D', 'ab', 'A B']) expect(ativosDoEstado({ terrasen: v }, { vetor: true })).toEqual([])
    expect(ativosDoEstado({}, { vetor: true })).toEqual([])
  })

  it('o registro de produção só conhece o parâmetro de Terrasen: um parâmetro do bioma sintético é ignorado', () => {
    expect(ativosDoEstado({ terrasen: 'AB', sintetico: '1' }, { vetor: true }).map((a) => a.bioma.id)).toEqual(['terrasen'])
  })

  it('com um registro de teste, cada bioma lê o SEU parâmetro, na ordem do registro', () => {
    const r = ativosDoEstado({ sintetico: '1', terrasen: 'AB' }, { vetor: true }, [TERRASEN, SINTETICO])
    expect(r.map((a) => a.bioma.id)).toEqual(['terrasen', 'sintetico'])
    expect(r[1]!.config).toEqual({ vetorial: true })
  })

  it('algumVetorial segue o modo vetorial de cada bioma', () => {
    expect(algumVetorial(ativosDoEstado({ terrasen: 'AB' }, { vetor: true }))).toBe(true)
    expect(algumVetorial(ativosDoEstado({ terrasen: 'AB' }, { vetor: false }))).toBe(false)
    expect(algumVetorial([])).toBe(false)
  })

  it('normalizarBiomas aceita o objeto histórico de ?terrasen e as opções genéricas, sem alterar nenhum dos dois', () => {
    const proto = { estilo: 'A' as const, estiloSepia: 'B' as const }
    expect(normalizarBiomas(proto)).toEqual({ ativos: ativosDeProto(proto) })
    expect(normalizarBiomas(undefined)).toEqual({ ativos: [] })
    const opcoes = { ativos: ativosDeProto(proto) }
    expect(normalizarBiomas(opcoes)).toBe(opcoes)
  })

  it('a assinatura para o cache distingue seleções e é estável', () => {
    const a = assinaturaDosAtivos(ativosDoEstado({ terrasen: 'AB' }, { vetor: true }))
    expect(assinaturaDosAtivos(ativosDoEstado({ terrasen: 'AB' }, { vetor: true }))).toBe(a)
    expect(assinaturaDosAtivos(ativosDoEstado({ terrasen: 'A' }, { vetor: true }))).not.toBe(a)
    expect(assinaturaDosAtivos([])).toBe('x')
  })
})
