'use client'

import { AttendanceService } from './attendance.service'
import { createClient } from '@/lib/supabase/client'

export const attendanceService = new AttendanceService(createClient())
