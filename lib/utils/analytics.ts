/**
 * Utilitaire centralisé pour le tracking d'événements analytics
 * Supporte Plausible et Google Analytics
 */

import { logger, sanitizeError } from '@/lib/utils/logger'
import { trackEvent as trackPlausible } from '@/components/analytics/plausible'
import { trackEvent as trackGA } from '@/components/analytics/google-analytics'

export type AnalyticsEvent =
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'document_created'
  | 'document_generated'
  | 'document_downloaded'
  | 'invoice_created'
  | 'invoice_sent'
  | 'payment_created'
  | 'payment_received'
  | 'session_created'
  | 'session_updated'
  | 'enrollment_created'
  | 'attendance_recorded'
  | 'message_sent'
  | 'conversation_created'
  | 'export_excel'
  | 'export_csv'
  | 'export_pdf'
  | 'search_performed'
  | 'theme_changed'
  | 'user_login'
  | 'user_logout'
  | 'settings_updated'
  | 'ab_test_assigned'
  | 'ab_test_impression'
  | 'ab_test_conversion'
  | 'experiment_assigned'
  | 'page_view'
  | 'conversion'

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Track un événement dans tous les services analytics configurés
 */
export function trackAnalyticsEvent(
  eventName: AnalyticsEvent,
  properties?: AnalyticsProperties
): void {
  if (typeof window === 'undefined') return

  // Track dans Plausible
  try {
    trackPlausible(eventName, properties)
  } catch (error) {
    logger.warn('Error tracking event in Plausible', { error })
  }

  // Track dans Google Analytics
  try {
    trackGA(eventName, properties)
  } catch (error) {
    logger.warn('Error tracking event in Google Analytics', { error })
  }
}

/**
 * Helpers pour les événements courants
 */
export const analytics = {
  page: {
    view: (data: {
      path: string
      title: string
      category?: string
      userId?: string
      organizationId?: string
      [key: string]: any
    }) => {
      const { path, title, category, userId, organizationId, ...rest } = data
      trackAnalyticsEvent('page_view' as AnalyticsEvent, {
        path,
        title,
        category: category || 'Page',
        user_id: userId,
        organization_id: organizationId,
        ...rest,
      })
    },
  },
  event: {
    track: (eventName: string, properties?: AnalyticsProperties) => {
      trackAnalyticsEvent(eventName as AnalyticsEvent, properties)
    },
  },
  conversion: {
    track: (conversionName: string, properties?: AnalyticsProperties) => {
      trackAnalyticsEvent('conversion' as AnalyticsEvent, {
        conversion_name: conversionName,
        ...properties,
      })
    },
  },
  student: {
    created: (studentId: string, organizationId: string) =>
      trackAnalyticsEvent('student_created', { student_id: studentId, organization_id: organizationId }),
    updated: (studentId: string) =>
      trackAnalyticsEvent('student_updated', { student_id: studentId }),
    deleted: (studentId: string) =>
      trackAnalyticsEvent('student_deleted', { student_id: studentId }),
  },
  document: {
    created: (documentId: string, type: string) =>
      trackAnalyticsEvent('document_created', { document_id: documentId, document_type: type }),
    generated: (type: string, count?: number) =>
      trackAnalyticsEvent('document_generated', { document_type: type, count }),
    downloaded: (documentId: string) =>
      trackAnalyticsEvent('document_downloaded', { document_id: documentId }),
  },
  invoice: {
    created: (invoiceId: string, amount: number, currency: string) =>
      trackAnalyticsEvent('invoice_created', {
        invoice_id: invoiceId,
        amount,
        currency,
      }),
    sent: (invoiceId: string) =>
      trackAnalyticsEvent('invoice_sent', { invoice_id: invoiceId }),
  },
  payment: {
    created: (paymentId: string, amount: number, method: string) =>
      trackAnalyticsEvent('payment_created', {
        payment_id: paymentId,
        amount,
        payment_method: method,
      }),
    received: (paymentId: string, amount: number) =>
      trackAnalyticsEvent('payment_received', { payment_id: paymentId, amount }),
  },
  session: {
    created: (sessionId: string) =>
      trackAnalyticsEvent('session_created', { session_id: sessionId }),
    updated: (sessionId: string) =>
      trackAnalyticsEvent('session_updated', { session_id: sessionId }),
  },
  enrollment: {
    created: (enrollmentId: string, sessionId: string) =>
      trackAnalyticsEvent('enrollment_created', {
        enrollment_id: enrollmentId,
        session_id: sessionId,
      }),
  },
  attendance: {
    recorded: (sessionId: string, count: number) =>
      trackAnalyticsEvent('attendance_recorded', { session_id: sessionId, count }),
  },
  message: {
    sent: (conversationId: string, hasAttachments: boolean) =>
      trackAnalyticsEvent('message_sent', {
        conversation_id: conversationId,
        has_attachments: hasAttachments,
      }),
  },
  conversation: {
    created: (conversationId: string, type: string) =>
      trackAnalyticsEvent('conversation_created', {
        conversation_id: conversationId,
        conversation_type: type,
      }),
  },
  export: {
    excel: (type: string, count: number) =>
      trackAnalyticsEvent('export_excel', { export_type: type, count }),
    csv: (type: string, count: number) =>
      trackAnalyticsEvent('export_csv', { export_type: type, count }),
    pdf: (type: string) =>
      trackAnalyticsEvent('export_pdf', { export_type: type }),
  },
  search: {
    performed: (query: string, resultCount: number) =>
      trackAnalyticsEvent('search_performed', { query, result_count: resultCount }),
  },
  theme: {
    changed: (theme: string) =>
      trackAnalyticsEvent('theme_changed', { theme }),
  },
  user: {
    login: (userId: string) =>
      trackAnalyticsEvent('user_login', { user_id: userId }),
    logout: () =>
      trackAnalyticsEvent('user_logout'),
  },
  settings: {
    updated: (section: string) =>
      trackAnalyticsEvent('settings_updated', { section }),
  },
}

