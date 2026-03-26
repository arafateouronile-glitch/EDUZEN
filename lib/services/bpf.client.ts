'use client'

import { createClient } from '@/lib/supabase/client'
import { BPFService } from './bpf.service'

export const bpfService = new BPFService(createClient())
