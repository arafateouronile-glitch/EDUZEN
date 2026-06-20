'use client'

import { TwoFactorAuthService } from './2fa.service'
import { createClient } from '@/lib/supabase/client'

// Instance par défaut pour usage côté client
export * from './2fa.service'
export const twoFactorAuthService = new TwoFactorAuthService(createClient())
