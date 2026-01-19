'use client'

import { PaymentService } from './payment.service'
import { createClient } from '@/lib/supabase/client'

export const paymentService = new PaymentService(createClient())
