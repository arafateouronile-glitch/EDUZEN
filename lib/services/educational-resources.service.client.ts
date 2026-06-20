'use client'

import { createClient } from '@/lib/supabase/client'
import { EducationalResourcesService } from './educational-resources.service'

export * from './educational-resources.service'
export const educationalResourcesService = new EducationalResourcesService(createClient())
