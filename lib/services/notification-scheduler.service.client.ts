'use client'

import { createClient } from '@/lib/supabase/client'
import { NotificationSchedulerService } from './notification-scheduler.service'

export const notificationSchedulerService = new NotificationSchedulerService(createClient())
