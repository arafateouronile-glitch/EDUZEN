'use client'

import { ElectronicAttendanceService } from './electronic-attendance.service'
import { createClient } from '@/lib/supabase/client'

export const electronicAttendanceService = new ElectronicAttendanceService(createClient())
