"use strict";
/**
 * EDUZEN API SDK - JavaScript/TypeScript
 *
 * @package @eduzen/sdk
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDUZENClient = void 0;
class EDUZENClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://app.eduzen.com/api';
        this.apiKey = config.apiKey;
        this.accessToken = config.accessToken;
        this.timeout = config.timeout || 30000;
    }
    /**
     * Set API key for authentication
     */
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Set access token for authentication
     */
    setAccessToken(accessToken) {
        this.accessToken = accessToken;
    }
    /**
     * Make an API request
     */
    async request(method, path, body, params) {
        const url = new URL(path, this.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        if (this.accessToken) {
            headers['Cookie'] = `sb-access-token=${this.accessToken}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url.toString(), {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok) {
                const errorData = data;
                return {
                    error: {
                        message: errorData.message || errorData.error || 'Request failed',
                        code: errorData.code || `HTTP_${response.status}`,
                        details: errorData.details,
                    },
                };
            }
            return { data: data };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error) {
                return {
                    error: {
                        message: error.message,
                        code: 'NETWORK_ERROR',
                    },
                };
            }
            return {
                error: {
                    message: 'Unknown error',
                    code: 'UNKNOWN_ERROR',
                },
            };
        }
    }
    // ========== 2FA ==========
    /**
     * Generate 2FA secret and QR code
     */
    async generate2FASecret() {
        return this.request('POST', '/2fa/generate-secret');
    }
    /**
     * Verify 2FA activation code
     */
    async verify2FAActivation(code) {
        return this.request('POST', '/2fa/verify-activation', { code });
    }
    // ========== USERS ==========
    /**
     * Create a new user
     */
    async createUser(userData) {
        return this.request('POST', '/users/create', userData);
    }
    // ========== STUDENTS ==========
    /**
     * Get all students
     */
    async getStudents(params) {
        return this.request('GET', '/v1/students', undefined, params);
    }
    // ========== PAYMENTS ==========
    /**
     * Create Stripe payment intent
     */
    async createStripeIntent(paymentData) {
        return this.request('POST', '/payments/stripe/create-intent', paymentData);
    }
    /**
     * Create SEPA direct debit
     */
    async createSEPADirectDebit(paymentData) {
        return this.request('POST', '/payments/sepa/create-direct-debit', paymentData);
    }
    /**
     * Initiate Mobile Money payment
     */
    async initiateMobileMoney(paymentData) {
        return this.request('POST', '/mobile-money/initiate', paymentData);
    }
    // ========== DOCUMENTS ==========
    /**
     * Generate document from template
     */
    async generateDocument(documentData) {
        return this.request('POST', '/documents/generate', documentData);
    }
    // ========== QR ATTENDANCE ==========
    /**
     * Generate QR code for session
     */
    async generateQRCode(qrData) {
        return this.request('POST', '/qr-attendance/generate', qrData);
    }
    /**
     * Scan QR code for attendance
     */
    async scanQRCode(scanData) {
        return this.request('POST', '/qr-attendance/scan', scanData);
    }
    // ========== COMPLIANCE ==========
    /**
     * Check compliance alerts
     */
    async checkComplianceAlerts() {
        return this.request('POST', '/compliance/alerts/check');
    }
    // ========== SESSIONS ==========
    /**
     * Get active sessions
     */
    async getActiveSessions() {
        return this.request('GET', '/sessions/active');
    }
    /**
     * Configure session timeout rules
     */
    async configureTimeoutRules(rules) {
        return this.request('POST', '/sessions/timeout-rules', rules);
    }
    /**
     * Revoke a session
     */
    async revokeSession(sessionId) {
        return this.request('POST', '/sessions/revoke', { session_id: sessionId });
    }
    // ========== QR ATTENDANCE ==========
    /**
     * Get active QR code for a session
     */
    async getActiveQRCode(sessionId) {
        return this.request('GET', `/qr-attendance/active/${sessionId}`);
    }
    /**
     * Deactivate a QR code
     */
    async deactivateQRCode(qrCodeId) {
        return this.request('POST', `/qr-attendance/deactivate/${qrCodeId}`);
    }
}
exports.EDUZENClient = EDUZENClient;
// Export default instance
exports.default = EDUZENClient;
