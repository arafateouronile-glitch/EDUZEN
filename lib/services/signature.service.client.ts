'use client'

import { SignatureService } from './signature.service'
import { createClient } from '@/lib/supabase/client'

export const signatureService = new SignatureService(createClient())
