import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  return NextResponse.json(
    { error: 'WebSocket endpoint not implemented' },
    { status: 501 }
  )
}

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'WebSocket endpoint not implemented' },
    { status: 501 }
  )
}
