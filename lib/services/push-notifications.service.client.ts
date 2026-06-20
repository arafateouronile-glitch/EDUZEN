'use client'

import { PushNotificationsService } from './push-notifications.service'
import { createClient } from '@/lib/supabase/client'

// Instance par défaut pour usage côté client
export * from './push-notifications.service'
export const pushNotificationsService = new PushNotificationsService(createClient())
