import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PushNotificationsService } from '@/lib/services/push-notifications.service'

/**
 * POST /api/push-notifications/unregister
 * Désenregistre un device
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
    }

    const pushNotificationsService = new PushNotificationsService(supabase)
    await pushNotificationsService.unregisterDevice(deviceId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error unregistering device:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
