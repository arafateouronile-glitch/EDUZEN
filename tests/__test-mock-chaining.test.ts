/**
 * Test minimal pour vérifier le chaînage des mocks Vitest
 */
import { describe, it, expect, vi } from 'vitest'

describe('Mock chaining test', () => {
  it('should chain mock methods correctly', () => {
    const mock = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    }

    // Configure chaining
    mock.from.mockReturnValue(mock)
    mock.select.mockReturnValue(mock)
    mock.eq.mockReturnValue(mock)
    mock.single.mockReturnValue(mock)

    // Test the chain
    const result1 = mock.from('test')
    expect(result1).toBe(mock)
    expect(typeof result1.select).toBe('function')

    const result2 = result1.select('*')
    expect(result2).toBe(mock)
    expect(typeof result2.eq).toBe('function')

    const result3 = result2.eq('id', '123')
    expect(result3).toBe(mock)
    expect(typeof result3.single).toBe('function')

    // Now configure single to return a promise
    mock.single.mockResolvedValueOnce({ data: 'test', error: null })

    // Test that single still works
    const promise = result3.single()
    expect(promise).toBeInstanceOf(Promise)
  })

  it('should work after vi.clearAllMocks with re-configuration', () => {
    const mock = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    }

    // Initial config
    mock.from.mockReturnValue(mock)
    mock.select.mockReturnValue(mock)
    mock.eq.mockReturnValue(mock)
    mock.single.mockReturnValue(mock)

    // Clear mocks
    vi.clearAllMocks()

    // Re-configure after clear
    mock.from.mockReturnValue(mock)
    mock.select.mockReturnValue(mock)
    mock.eq.mockReturnValue(mock)
    mock.single.mockReturnValue(mock)

    // Test chain still works
    const result = mock.from('test').select('*').eq('id', '123')
    expect(result).toBe(mock)
    expect(typeof result.single).toBe('function')
  })
})
