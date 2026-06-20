'use client'

import { createClient } from '@/lib/supabase/client'
import { CurrencyService } from './currency.service'

export * from './currency.service'
export const currencyService = new CurrencyService(createClient())
