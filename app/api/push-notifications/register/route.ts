import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { PushNotificationsService } from '@/lib/services/push-notifications.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/push-notifications/register
 * Enregistre un device pour recevoir des notifications push
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
    const { deviceToken, deviceType, platform, deviceName, deviceModel, osVersion, appVersion } =
      body

    if (!deviceToken || !deviceType || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceToken, deviceType, platform' },
        { status: 400 }
      )
    }

    const orgId = await getUserOrgId(supabase, user.id)

    const pushNotificationsService = new PushNotificationsService(supabase)
    const device = await pushNotificationsService.registerDevice({
      user_id: user.id,
      organization_id: orgId,
      device_token: deviceToken,
      device_type: deviceType,
      platform,
      device_name: deviceName,
      device_model: deviceModel,
      os_version: osVersion,
      app_version: appVersion,
    })

    return NextResponse.json({ device })
  } catch (error: unknown) {
    logger.error('Error registering device:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
