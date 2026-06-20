'use client'

import { SignatureService } from './signature.service'
import { createClient } from '@/lib/supabase/client'

export * from './signature.service'
export const signatureService = new SignatureService(createClient())
