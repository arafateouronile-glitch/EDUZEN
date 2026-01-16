/**
 * Test pour comprendre le problème avec mockResolvedValueOnce sur .eq()
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Mock eq + clearAllMocks problem', () => {
  const { mockSupabase } = vi.hoisted(() => {
    const createMock = () => {
      const mock = {
        from: vi.fn(),
        select: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
      }
      mock.from.mockReturnValue(mock)
      mock.select.mockReturnValue(mock)
      mock.eq.mockReturnValue(mock)
      mock.single.mockReturnValue(mock)
      return mock
    }
    return { mockSupabase: createMock() }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-configure chaining
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.single.mockReturnValue(mockSupabase)
  })

  it('test 1: chain should work with .single() mock', async () => {
    // Mock the terminal method
    mockSupabase.single.mockResolvedValueOnce({ data: 'test1', error: null })

    // Simulate the service call
    const result = await mockSupabase.from('table').select('*').eq('id', '1').single()

    expect(result).toEqual({ data: 'test1', error: null })
  })

  it('test 2: should still work after previous test', async () => {
    // Mock the terminal method again
    mockSupabase.single.mockResolvedValueOnce({ data: 'test2', error: null })

    // This should work
    const result = await mockSupabase.from('table').select('*').eq('id', '2').single()

    expect(result).toEqual({ data: 'test2', error: null })
  })

  it('test 3: what happens if we mock .eq() instead?', async () => {
    // Mock .eq() to return a promise (THIS BREAKS THE CHAIN)
    mockSupabase.eq.mockResolvedValueOnce({ data: 'test3', error: null })

    // This will work but...
    const result = await mockSupabase.from('table').select('*').eq('id', '3')

    expect(result).toEqual({ data: 'test3', error: null })
  })

  it('test 4: after mocking .eq(), the chain is broken for next test', async () => {
    // Try to use the chain normally
    mockSupabase.single.mockResolvedValueOnce({ data: 'test4', error: null })

    // This should work but might not if .eq() was broken in previous test
    const result = await mockSupabase.from('table').select('*').eq('id', '4').single()

    expect(result).toEqual({ data: 'test4', error: null })
  })
})
