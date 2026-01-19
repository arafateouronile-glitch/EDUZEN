/**
 * EDUZEN API SDK - JavaScript/TypeScript
 *
 * @package @eduzen/sdk
 * @version 1.0.0
 */
export interface EDUZENConfig {
    baseUrl?: string;
    apiKey?: string;
    accessToken?: string;
    timeout?: number;
}
export interface EDUZENResponse<T = unknown> {
    data?: T;
    error?: {
        message: string;
        code: string;
        details?: Record<string, unknown>;
    };
    pagination?: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
export declare class EDUZENClient {
    private baseUrl;
    private apiKey?;
    private accessToken?;
    private timeout;
    constructor(config?: EDUZENConfig);
    /**
     * Set API key for authentication
     */
    setAPIKey(apiKey: string): void;
    /**
     * Set access token for authentication
     */
    setAccessToken(accessToken: string): void;
    /**
     * Make an API request
     */
    private request;
    /**
     * Generate 2FA secret and QR code
     */
    generate2FASecret(): Promise<EDUZENResponse<{
        secret: string;
        qrCodeUrl: string;
        backupCodes: string[];
    }>>;
    /**
     * Verify 2FA activation code
     */
    verify2FAActivation(code: string): Promise<EDUZENResponse<{
        success: boolean;
        message: string;
    }>>;
    /**
     * Create a new user
     */
    createUser(userData: {
        email: string;
        full_name: string;
        phone?: string;
        organization_id: string;
        password?: string;
        role?: string;
        is_active?: boolean;
        send_invitation?: boolean;
    }): Promise<EDUZENResponse<{
        user: {
            id: string;
            email: string;
            full_name: string;
            role: string;
            is_active: boolean;
        };
        message: string;
    }>>;
    /**
     * Get all students
     */
    getStudents(params?: {
        organization_id: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<EDUZENResponse<Array<{
        id: string;
        first_name: string;
        last_name: string;
        student_number: string;
        email: string;
        status: string;
    }>>>;
    /**
     * Create Stripe payment intent
     */
    createStripeIntent(paymentData: {
        amount: number;
        currency?: string;
        description?: string;
        customer_email: string;
        customer_name?: string;
        metadata?: Record<string, unknown>;
        return_url?: string;
        cancel_url?: string;
    }): Promise<EDUZENResponse<{
        paymentIntentId: string;
        clientSecret: string;
        status: string;
        paymentId: string;
    }>>;
    /**
     * Create SEPA direct debit
     */
    createSEPADirectDebit(paymentData: {
        amount: number;
        currency?: string;
        description?: string;
        debtor_name: string;
        debtor_iban: string;
        debtor_bic?: string;
        reference: string;
        due_date: string;
        mandate_id: string;
        creditor_name: string;
        creditor_iban: string;
        creditor_id: string;
    }): Promise<EDUZENResponse<{
        paymentId: string;
        status: string;
        iban: string;
        reference: string;
        dueDate: string;
    }>>;
    /**
     * Initiate Mobile Money payment
     */
    initiateMobileMoney(paymentData: {
        provider: 'mtn' | 'orange' | 'airtel';
        amount: number;
        currency?: string;
        phone_number: string;
        description?: string;
        invoice_id?: string;
    }): Promise<EDUZENResponse<{
        success: boolean;
        transaction_id: string;
        status: string;
        message: string;
    }>>;
    /**
     * Generate document from template
     */
    generateDocument(documentData: {
        template_id: string;
        format: 'pdf' | 'docx' | 'html';
        variables?: Record<string, unknown>;
        send_email?: boolean;
        email_to?: string;
    }): Promise<EDUZENResponse<{
        success: boolean;
        document_id: string;
        file_url: string;
        format: string;
    }>>;
    /**
     * Generate QR code for session
     */
    generateQRCode(qrData: {
        session_id: string;
        duration_minutes?: number;
        max_scans?: number;
        require_location?: boolean;
        allowed_radius_meters?: number;
    }): Promise<EDUZENResponse<{
        success: boolean;
        qr_code: {
            id: string;
            qr_code_data: string;
            expires_at: string;
        };
        qr_code_image: string;
    }>>;
    /**
     * Scan QR code for attendance
     */
    scanQRCode(scanData: {
        qr_code: string;
        student_id: string;
        latitude?: number;
        longitude?: number;
    }): Promise<EDUZENResponse<{
        success: boolean;
        attendance_id: string;
        message: string;
    }>>;
    /**
     * Check compliance alerts
     */
    checkComplianceAlerts(): Promise<EDUZENResponse<{
        success: boolean;
        timestamp: string;
        results: Record<string, {
            passed: boolean;
            alerts: Array<{
                id: string;
                type: string;
                severity: string;
                message: string;
            }>;
        }>;
    }>>;
    /**
     * Get active sessions
     */
    getActiveSessions(): Promise<EDUZENResponse<{
        sessions: Array<{
            id: string;
            title: string;
            start_time: string;
            end_time: string;
            status: string;
        }>;
    }>>;
    /**
     * Configure session timeout rules
     */
    configureTimeoutRules(rules: {
        organization_id: string;
        idle_timeout_minutes?: number;
        absolute_timeout_minutes?: number;
        warning_before_timeout_minutes?: number;
    }): Promise<EDUZENResponse<{
        success: boolean;
        timeout_rules: {
            idle_timeout_minutes: number;
            absolute_timeout_minutes: number;
            warning_before_timeout_minutes: number;
        };
    }>>;
    /**
     * Revoke a session
     */
    revokeSession(sessionId: string): Promise<EDUZENResponse<{
        success: boolean;
        message: string;
    }>>;
    /**
     * Get active QR code for a session
     */
    getActiveQRCode(sessionId: string): Promise<EDUZENResponse<{
        success: boolean;
        qr_code: {
            id: string;
            qr_code_data: string;
            expires_at: string;
        } | null;
        qr_code_image?: string;
    }>>;
    /**
     * Deactivate a QR code
     */
    deactivateQRCode(qrCodeId: string): Promise<EDUZENResponse<{
        success: boolean;
    }>>;
}
export default EDUZENClient;
