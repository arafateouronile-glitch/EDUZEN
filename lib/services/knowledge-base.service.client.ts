'use client'

import { createClient } from '@/lib/supabase/client'
import { KnowledgeBaseService } from './knowledge-base.service'

export const knowledgeBaseService = new KnowledgeBaseService(createClient())
