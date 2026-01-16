import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { transactionId: string } }
) {
  return NextResponse.json(
    { error: 'Not implemented', transactionId: params.transactionId },
    { status: 501 }
  )
}
