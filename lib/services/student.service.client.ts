'use client'

import { StudentService } from './student.service'
import { createClient } from '@/lib/supabase/client'

export * from './student.service'
export const studentService = new StudentService(createClient())
