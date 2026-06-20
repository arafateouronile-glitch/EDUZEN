'use client'

import { createClient } from '@/lib/supabase/client'
import { LearnerNotificationsService } from './learner-notifications.service'

export * from './learner-notifications.service'
export const learnerNotificationsService = new LearnerNotificationsService(createClient())
