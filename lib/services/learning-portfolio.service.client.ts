'use client'

import { createClient } from '@/lib/supabase/client'
import { LearningPortfolioService } from './learning-portfolio.service'

export * from './learning-portfolio.service'
export const learningPortfolioService = new LearningPortfolioService(createClient())
