import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/mobile-money/status/[transactionId]/route'

describe('mobile-money status', () => {
  it('501', async () => {
    const req = new NextRequest('http://localhost/api/mobile-money/status/tx1')
    const res = await GET(req, { params: Promise.resolve({ transactionId: 'tx1' }) })
    expect(res.status).toBe(501)
  })
})
