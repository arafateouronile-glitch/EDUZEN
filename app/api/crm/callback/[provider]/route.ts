import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { provider: string } }
) {
  return NextResponse.json(
    { error: 'Not implemented', provider: params.provider },
    { status: 501 }
  )
}
