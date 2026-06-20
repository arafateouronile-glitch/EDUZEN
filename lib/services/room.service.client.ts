'use client'

import { createClient } from '@/lib/supabase/client'
import { RoomService } from './room.service'

export * from './room.service'
export const roomService = new RoomService(createClient())
