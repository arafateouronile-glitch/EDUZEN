/**
 * EDUZEN API SDK - JavaScript/TypeScript
 * 
 * @package @eduzen/sdk
 * @version 1.0.0
 */

export interface EDUZENConfig {
  baseUrl?: string
  apiKey?: string
  accessToken?: string
  timeout?: number
}

export interface EDUZENResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code: string
    details?: Record<string, unknown>
  }
  pagination?: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export class EDUZENClient {
  private baseUrl: string
  private apiKey?: string
  private accessToken?: string
  private timeout: number

  constructor(config: EDUZENConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://app.eduzen.com/api'
    this.apiKey = config.apiKey
    this.accessToken = config.accessToken
    this.timeout = config.timeout || 30000
  }

  /**
   * Set API key for authentication
   */
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Set access token for authentication
   */
  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | boolean>
  ): Promise<EDUZENResponse<T>> {
    const url = new URL(path, this.baseUrl)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    if (this.accessToken) {
      headers['Cookie'] = `sb-access-token=${this.accessToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json() as Record<string, unknown>

      if (!response.ok) {
        const errorData = data as { message?: string; error?: string; code?: string; details?: Record<string, unknown> }
        return {
          error: {
            message: errorData.message || errorData.error || 'Request failed',
            code: errorData.code || `HTTP_${response.status}`,
            details: errorData.details,
          },
        }
      }

      return { data: data as T }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        return {
          error: {
            message: error.message,
            code: 'NETWORK_ERROR',
          },
        }
      }

      return {
        error: {
          message: 'Unknown error',
          code: 'UNKNOWN_ERROR',
        },
      }
    }
  }

  // ========== 2FA ==========

  /**
   * Generate 2FA secret and QR code
   */
  async generate2FASecret(): Promise<EDUZENResponse<{
    secret: string
    qrCodeUrl: string
    backupCodes: string[]
  }>> {
    return this.request('POST', '/2fa/generate-secret')
  }

  /**
   * Verify 2FA activation code
   */
  async verify2FAActivation(code: string): Promise<EDUZENResponse<{
    success: boolean
    message: string
  }>> {
    return this.request('POST', '/2fa/verify-activation', { code })
  }

  // ========== USERS ==========

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string
    full_name: string
    phone?: string
    organization_id: string
    password?: string
    role?: string
    is_active?: boolean
    send_invitation?: boolean
  }): Promise<EDUZENResponse<{
    user: {
      id: string
      email: string
      full_name: string
      role: string
      is_active: boolean
    }
    message: string
  }>> {
    return this.request('POST', '/users/create', userData)
  }

  // ========== STUDENTS ==========

  /**
   * Get all students
   */
  async getStudents(params?: {
    organization_id: string
    page?: number
    limit?: number
    search?: string
  }): Promise<EDUZENResponse<Array<{
    id: string
    first_name: string
    last_name: string
    student_number: string
    email: string
    status: string
  }>>> {
    return this.request('GET', '/v1/students', undefined, params)
  }

  // ========== PAYMENTS ==========

  /**
   * Create Stripe payment intent
   */
  async createStripeIntent(paymentData: {
    amount: number
    currency?: string
    description?: string
    customer_email: string
    customer_name?: string
    metadata?: Record<string, unknown>
    return_url?: string
    cancel_url?: string
  }): Promise<EDUZENResponse<{
    paymentIntentId: string
    clientSecret: string
    status: string
    paymentId: string
  }>> {
    return this.request('POST', '/payments/stripe/create-intent', paymentData)
  }

  /**
   * Create SEPA direct debit
   */
  async createSEPADirectDebit(paymentData: {
    amount: number
    currency?: string
    description?: string
    debtor_name: string
    debtor_iban: string
    debtor_bic?: string
    reference: string
    due_date: string
    mandate_id: string
    creditor_name: string
    creditor_iban: string
    creditor_id: string
  }): Promise<EDUZENResponse<{
    paymentId: string
    status: string
    iban: string
    reference: string
    dueDate: string
  }>> {
    return this.request('POST', '/payments/sepa/create-direct-debit', paymentData)
  }

  /**
   * Initiate Mobile Money payment
   */
  async initiateMobileMoney(paymentData: {
    provider: 'mtn' | 'orange' | 'airtel'
    amount: number
    currency?: string
    phone_number: string
    description?: string
    invoice_id?: string
  }): Promise<EDUZENResponse<{
    success: boolean
    transaction_id: string
    status: string
    message: string
  }>> {
    return this.request('POST', '/mobile-money/initiate', paymentData)
  }

  // ========== DOCUMENTS ==========

  /**
   * Generate document from template
   */
  async generateDocument(documentData: {
    template_id: string
    format: 'pdf' | 'docx' | 'html'
    variables?: Record<string, unknown>
    send_email?: boolean
    email_to?: string
  }): Promise<EDUZENResponse<{
    success: boolean
    document_id: string
    file_url: string
    format: string
  }>> {
    return this.request('POST', '/documents/generate', documentData)
  }

  // ========== QR ATTENDANCE ==========

  /**
   * Generate QR code for session
   */
  async generateQRCode(qrData: {
    session_id: string
    duration_minutes?: number
    max_scans?: number
    require_location?: boolean
    allowed_radius_meters?: number
  }): Promise<EDUZENResponse<{
    success: boolean
    qr_code: {
      id: string
      qr_code_data: string
      expires_at: string
    }
    qr_code_image: string
  }>> {
    return this.request('POST', '/qr-attendance/generate', qrData)
  }

  /**
   * Scan QR code for attendance
   */
  async scanQRCode(scanData: {
    qr_code: string
    student_id: string
    latitude?: number
    longitude?: number
  }): Promise<EDUZENResponse<{
    success: boolean
    attendance_id: string
    message: string
  }>> {
    return this.request('POST', '/qr-attendance/scan', scanData)
  }

  // ========== COMPLIANCE ==========

  /**
   * Check compliance alerts
   */
  async checkComplianceAlerts(): Promise<EDUZENResponse<{
    success: boolean
    timestamp: string
    results: Record<string, {
      passed: boolean
      alerts: Array<{
        id: string
        type: string
        severity: string
        message: string
      }>
    }>
  }>> {
    return this.request('POST', '/compliance/alerts/check')
  }

  // ========== SESSIONS ==========

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<EDUZENResponse<{
    sessions: Array<{
      id: string
      title: string
      start_time: string
      end_time: string
      status: string
    }>
  }>> {
    return this.request('GET', '/sessions/active')
  }

  /**
   * Configure session timeout rules
   */
  async configureTimeoutRules(rules: {
    organization_id: string
    idle_timeout_minutes?: number
    absolute_timeout_minutes?: number
    warning_before_timeout_minutes?: number
  }): Promise<EDUZENResponse<{
    success: boolean
    timeout_rules: {
      idle_timeout_minutes: number
      absolute_timeout_minutes: number
      warning_before_timeout_minutes: number
    }
  }>> {
    return this.request('POST', '/sessions/timeout-rules', rules)
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<EDUZENResponse<{
    success: boolean
    message: string
  }>> {
    return this.request('POST', '/sessions/revoke', { session_id: sessionId })
  }

  // ========== QR ATTENDANCE ==========

  /**
   * Get active QR code for a session
   */
  async getActiveQRCode(sessionId: string): Promise<EDUZENResponse<{
    success: boolean
    qr_code: {
      id: string
      qr_code_data: string
      expires_at: string
    } | null
    qr_code_image?: string
  }>> {
    return this.request('GET', `/qr-attendance/active/${sessionId}`)
  }

  /**
   * Deactivate a QR code
   */
  async deactivateQRCode(qrCodeId: string): Promise<EDUZENResponse<{
    success: boolean
  }>> {
    return this.request('POST', `/qr-attendance/deactivate/${qrCodeId}`)
  }
}

// Export default instance
export default EDUZENClient

