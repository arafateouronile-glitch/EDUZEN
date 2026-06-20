'use client'

import { createClient } from '@/lib/supabase/client'
import { TutorialVideosService } from './tutorial-videos.service'

export * from './tutorial-videos.service'
export const tutorialVideosService = new TutorialVideosService(createClient())
