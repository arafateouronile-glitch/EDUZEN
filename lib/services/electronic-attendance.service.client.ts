'use client'

import { ElectronicAttendanceService } from './electronic-attendance.service'
import { createClient } from '@/lib/supabase/client'

export * from './electronic-attendance.service'
export const electronicAttendanceService = new ElectronicAttendanceService(createClient())
