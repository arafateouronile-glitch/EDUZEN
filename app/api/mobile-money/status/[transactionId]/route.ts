import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params
  return NextResponse.json(
    { error: 'Not implemented', transactionId },
    { status: 501 }
  )
}
