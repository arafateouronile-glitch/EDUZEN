'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import {
  getAffiliateWelcomeEmailSubject,
  getAffiliateWelcomeEmailHtml,
} from '@/lib/email-templates/affiliate-welcome'
import type {
  Affiliate,
  AffiliateCampaign,
  AffiliateStatus,
  AffiliatePayoutStatus,
  CreateAffiliateInput,
  CreateAffiliateCampaignInput,
} from '@/types/super-admin.types'
import { logger } from '@/lib/utils/logger'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.fr'
const KIT_BANNERS_URL = process.env.NEXT_PUBLIC_AFFILIATE_KIT_URL || BASE_URL
const KIT_VSL_URL = process.env.NEXT_PUBLIC_AFFILIATE_VSL_URL || BASE_URL
const DASHBOARD_AFFILIATE_PATH = '/dashboard/affiliate'
const DEFAULT_COMMISSION_PERCENT = 30
const DEFAULT_PAYMENT_THRESHOLD_EUR = 50
const DEFAULT_COOKIE_DAYS = 60

const AFFILIATION_PATH = '/super-admin/affiliation'

async function ensureSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!admin || (admin as { role?: string }).role !== 'super_admin') {
    throw new Error('Accès réservé aux super admins')
  }
  return supabase
}

export async function updateAffiliateStatus(
  affiliateId: string,
  status: AffiliateStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { error } = await supabase
      .from('affiliates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', affiliateId)

    if (error) {
      logger.error('[affiliate-actions] updateAffiliateStatus', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/affiliates`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] updateAffiliateStatus', e)
    return { success: false, error: msg }
  }
}

export async function createAffiliate(
  input: CreateAffiliateInput
): Promise<{ success: boolean; data?: Affiliate; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        email: input.email,
        full_name: input.full_name ?? null,
        company_name: input.company_name ?? null,
        status: 'pending',
        commission_rate_override: input.commission_rate_override ?? null,
        payment_iban: input.payment_iban ?? null,
        payment_bic: input.payment_bic ?? null,
        payment_holder_name: input.payment_holder_name ?? null,
        campaign_id: input.campaign_id ?? null,
        cookie_days: input.cookie_days ?? 60,
      })
      .select()
      .single()

    if (error) {
      logger.error('[affiliate-actions] createAffiliate', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/affiliates`)
    return { success: true, data: data as Affiliate }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] createAffiliate', e)
    return { success: false, error: msg }
  }
}

export async function updateAffiliate(
  affiliateId: string,
  input: Partial<CreateAffiliateInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { error } = await supabase
      .from('affiliates')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId)

    if (error) {
      logger.error('[affiliate-actions] updateAffiliate', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/affiliates`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] updateAffiliate', e)
    return { success: false, error: msg }
  }
}

export async function createAffiliateCampaign(
  input: CreateAffiliateCampaignInput
): Promise<{ success: boolean; data?: AffiliateCampaign; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { data, error } = await supabase
      .from('affiliate_campaigns')
      .insert({
        name: input.name,
        description: input.description ?? null,
        commission_type: input.commission_type,
        commission_percent: input.commission_percent,
        cookie_days: input.cookie_days ?? 60,
        is_active: input.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      logger.error('[affiliate-actions] createAffiliateCampaign', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/campaigns`)
    return { success: true, data: data as AffiliateCampaign }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] createAffiliateCampaign', e)
    return { success: false, error: msg }
  }
}

export async function updateAffiliateCampaign(
  campaignId: string,
  input: Partial<CreateAffiliateCampaignInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { error } = await supabase
      .from('affiliate_campaigns')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    if (error) {
      logger.error('[affiliate-actions] updateAffiliateCampaign', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/campaigns`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] updateAffiliateCampaign', e)
    return { success: false, error: msg }
  }
}

export async function approvePayout(
  payoutId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { error } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    if (error) {
      logger.error('[affiliate-actions] approvePayout', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/payouts`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] approvePayout', e)
    return { success: false, error: msg }
  }
}

export async function updatePayoutStatus(
  payoutId: string,
  status: AffiliatePayoutStatus,
  reference?: string | null,
  paid_at?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (reference !== undefined) updates.reference = reference
    if (paid_at !== undefined) updates.paid_at = paid_at

    const { error } = await supabase
      .from('affiliate_payouts')
      .update(updates)
      .eq('id', payoutId)

    if (error) {
      logger.error('[affiliate-actions] updatePayoutStatus', error)
      return { success: false, error: error.message }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/payouts`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] updatePayoutStatus', e)
    return { success: false, error: msg }
  }
}

/**
 * Extrait le prénom depuis full_name ou company_name.
 */
function getFirstName(affiliate: Affiliate): string {
  const full = affiliate.full_name?.trim()
  if (full) {
    const first = full.split(/\s+/)[0]
    if (first) return first
  }
  const company = affiliate.company_name?.trim()
  if (company) return company
  return 'Partenaire'
}

/**
 * Génère et envoie l'email de bienvenue partenaire (template complet :
 * outils de croissance, kit marketing, rappel avantages, signature Arafate).
 */
export async function sendAffiliateMarketingKit(
  affiliateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await ensureSuperAdmin()
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('*, affiliate_campaigns(commission_percent, cookie_days)')
      .eq('id', affiliateId)
      .single()

    if (affError || !affiliate) {
      return { success: false, error: 'Affilié introuvable' }
    }

    const { data: promo } = await supabase
      .from('promo_codes')
      .select('code, discount_value')
      .eq('affiliate_id', affiliateId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    const aff = affiliate as Affiliate & { affiliate_campaigns?: { commission_percent: number; cookie_days: number } | null }
    const campaign = aff.affiliate_campaigns
    const commissionPercent = aff.commission_rate_override ?? campaign?.commission_percent ?? DEFAULT_COMMISSION_PERCENT
    const cookieDays = aff.cookie_days ?? campaign?.cookie_days ?? DEFAULT_COOKIE_DAYS

    const link = `${BASE_URL}?ref=${affiliateId}`
    const code = (promo as { code: string; discount_value: number } | null)?.code ?? '—'
    const discount = (promo as { code: string; discount_value: number } | null)?.discount_value ?? 0
    const dashboardUrl = `${BASE_URL}${DASHBOARD_AFFILIATE_PATH}`

    const html = getAffiliateWelcomeEmailHtml({
      firstName: getFirstName(aff),
      referralLink: link,
      promoCode: code,
      promoDiscountPercent: discount || undefined,
      dashboardUrl,
      kitUrl: KIT_BANNERS_URL,
      commissionPercent: Number(commissionPercent),
      paymentThresholdEur: DEFAULT_PAYMENT_THRESHOLD_EUR,
      cookieDays: Number(cookieDays),
    })

    const result = await sendEmailViaResend({
      to: aff.email,
      subject: getAffiliateWelcomeEmailSubject(),
      html,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }
    revalidatePath(AFFILIATION_PATH)
    revalidatePath(`${AFFILIATION_PATH}/affiliates`)
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-actions] sendAffiliateMarketingKit', e)
    return { success: false, error: msg }
  }
}
