import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  return NextResponse.json(
    { error: 'Not implemented', provider },
    { status: 501 }
  )
}
