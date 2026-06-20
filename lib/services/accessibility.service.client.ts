'use client'

import { createClient } from '@/lib/supabase/client'
import { AccessibilityService } from './accessibility.service'

export * from './accessibility.service'
export const accessibilityService = new AccessibilityService(createClient())
