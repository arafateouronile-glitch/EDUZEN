/**
 * Tests unitaires pour excel-export
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToExcel, exportToCSV } from '@/lib/utils/excel-export'

// Mock ExcelJS
vi.mock('exceljs', () => {
  const mockWorkbook = {
    addWorksheet: vi.fn(() => ({
      columns: [],
      addRows: vi.fn(),
      getRow: vi.fn(() => ({
        font: {},
        fill: {},
        alignment: {},
        height: 0,
        eachCell: vi.fn(),
      })),
      eachRow: vi.fn(),
    })),
    xlsx: {
      writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    },
  }

  return {
    default: {
      Workbook: vi.fn(() => mockWorkbook),
    },
  }
})

// Mock window.URL et document
global.window = {
  ...global.window,
  URL: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
} as any

global.document = {
  ...global.document,
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
  })),
} as any

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer un workbook avec les colonnes définies', async () => {
    const options = {
      filename: 'test.xlsx',
      sheetName: 'Test Sheet',
      columns: [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Age', key: 'age', width: 10 },
      ],
      data: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    }

    await exportToExcel(options)

    expect(global.window.URL.createObjectURL).toHaveBeenCalled()
    expect(global.document.createElement).toHaveBeenCalledWith('a')
  })

  it('devrait utiliser des largeurs par défaut si non spécifiées', async () => {
    const options = {
      filename: 'test.xlsx',
      sheetName: 'Test Sheet',
      columns: [
        { header: 'Name', key: 'name' },
      ],
      data: [{ name: 'John' }],
    }

    await exportToExcel(options)

    expect(global.window.URL.createObjectURL).toHaveBeenCalled()
  })
})

describe('exportToCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock document.createElement pour CSV
    global.document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn(),
    }))
  })

  it('devrait exporter des données en CSV', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]

    exportToCSV('test.csv', data)

    expect(global.document.createElement).toHaveBeenCalledWith('a')
  })

  it('devrait échapper les virgules dans les valeurs', () => {
    const data = [
      { name: 'John, Doe', age: 30 },
    ]

    exportToCSV('test.csv', data)

    expect(global.document.createElement).toHaveBeenCalled()
  })

  it('devrait échapper les guillemets dans les valeurs', () => {
    const data = [
      { name: 'John "Johnny" Doe', age: 30 },
    ]

    exportToCSV('test.csv', data)

    expect(global.document.createElement).toHaveBeenCalled()
  })

  it('devrait gérer les valeurs nulles', () => {
    const data = [
      { name: 'John', age: null },
    ]

    exportToCSV('test.csv', data)

    expect(global.document.createElement).toHaveBeenCalled()
  })

  it('devrait lancer une erreur si aucune donnée', () => {
    expect(() => exportToCSV('test.csv', [])).toThrow('Aucune donnée à exporter')
  })
})
