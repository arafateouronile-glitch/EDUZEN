'use client'

import { InvoiceService } from './invoice.service'
import { createClient } from '@/lib/supabase/client'

export const invoiceService = new InvoiceService(createClient())
