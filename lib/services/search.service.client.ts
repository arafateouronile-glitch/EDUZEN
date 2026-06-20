'use client'

import { createClient } from '@/lib/supabase/client'
import { SearchService } from './search.service'

export const searchService = new SearchService(createClient())
