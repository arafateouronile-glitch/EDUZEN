import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { provider: string } }
) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  )
}
