'use client'

import { InvoiceService } from './invoice.service'
import { createClient } from '@/lib/supabase/client'

export * from './invoice.service'
export const invoiceService = new InvoiceService(createClient())
