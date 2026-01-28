'use client'

import { StudentService } from './student.service'
import { createClient } from '@/lib/supabase/client'

export const studentService = new StudentService(createClient())
