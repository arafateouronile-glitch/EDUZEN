import { describe, it, expect } from 'vitest'
import { FEC_EXPORT_MODELS, DEFAULT_FEC_EXPORT_MODEL, getFecExportModel } from '@/lib/services/accounting/export-models'

describe('export-models', () => {
  it('exposes the FEC legal model as the default, header included, pipe separator', () => {
    expect(DEFAULT_FEC_EXPORT_MODEL).toBe('fec_legal')
    const model = getFecExportModel()
    expect(model.id).toBe('fec_legal')
    expect(model.separator).toBe('|')
    expect(model.includeHeader).toBe(true)
    expect(model.unverified).toBeFalsy()
  })

  it('exposes the Fulll custom model as unverified, no header, semicolon separator', () => {
    const model = getFecExportModel('fulll_custom')
    expect(model.separator).toBe(';')
    expect(model.includeHeader).toBe(false)
    expect(model.unverified).toBe(true)
  })

  it('falls back to the default model for an unknown id', () => {
    expect(getFecExportModel('does-not-exist').id).toBe('fec_legal')
    expect(getFecExportModel(null).id).toBe('fec_legal')
    expect(getFecExportModel(undefined).id).toBe('fec_legal')
  })

  it('every model has a distinct id and file prefix', () => {
    const ids = FEC_EXPORT_MODELS.map((m) => m.id)
    const prefixes = FEC_EXPORT_MODELS.map((m) => m.filePrefix)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })
})
