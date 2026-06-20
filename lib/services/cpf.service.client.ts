'use client'

import { createClient } from '@/lib/supabase/client'
import { CPFService } from './cpf.service'

export const cpfService = new CPFService(createClient())
