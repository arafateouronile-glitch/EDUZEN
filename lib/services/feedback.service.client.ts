'use client'

import { createClient } from '@/lib/supabase/client'
import { FeedbackService } from './feedback.service'

export const feedbackService = new FeedbackService(createClient())
