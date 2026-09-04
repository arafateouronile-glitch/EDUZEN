'use client'

import { createClient } from '@/lib/supabase/client'
import { AccountingService } from './accounting.service'

export * from './accounting.service'

/**
 * Instance client de `AccountingService`.
 * Côté navigateur, seules les lectures/écritures RLS-safe sont utilisées
 * (`getConfig`, `upsertConfig`, `getSyncLogs`). Les envois vers le système
 * comptable passent obligatoirement par la route API `/api/accounting/sync`.
 */
export const accountingService = new AccountingService(createClient())
