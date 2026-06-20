'use client'

import { PaymentService } from './payment.service'
import { createClient } from '@/lib/supabase/client'

export * from './payment.service'
export const paymentService = new PaymentService(createClient())
