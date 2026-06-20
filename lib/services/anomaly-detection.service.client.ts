'use client'

import { createClient } from '@/lib/supabase/client'
import { AnomalyDetectionService } from './anomaly-detection.service'

export const anomalyDetectionService = new AnomalyDetectionService(createClient())
