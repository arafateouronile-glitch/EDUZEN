"""
EDUZEN API Client for Python
"""

import requests
from typing import Optional, Dict, Any, List
from .exceptions import EDUZENError, EDUZENAPIError, EDUZENNetworkError


class EDUZENClient:
    """Client for EDUZEN API"""

    def __init__(
        self,
        base_url: str = "https://app.eduzen.com/api",
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        Initialize EDUZEN client

        Args:
            base_url: Base URL for API (default: https://app.eduzen.com/api)
            api_key: API key for authentication
            access_token: Access token for authentication
            timeout: Request timeout in seconds (default: 30)
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.access_token = access_token
        self.timeout = timeout

    def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make API request

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API path
            data: Request body data
            params: Query parameters

        Returns:
            Response data

        Raises:
            EDUZENAPIError: API error
            EDUZENNetworkError: Network error
        """
        url = f"{self.base_url}{path}"

        headers = {
            "Content-Type": "application/json",
        }

        if self.api_key:
            headers["X-API-Key"] = self.api_key

        if self.access_token:
            headers["Cookie"] = f"sb-access-token={self.access_token}"

        try:
            response = requests.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            if isinstance(e, requests.exceptions.HTTPError):
                try:
                    error_data = e.response.json()
                    raise EDUZENAPIError(
                        message=error_data.get("message", "API error"),
                        code=error_data.get("code", f"HTTP_{e.response.status_code}"),
                        status_code=e.response.status_code,
                        details=error_data.get("details"),
                    )
                except ValueError:
                    raise EDUZENAPIError(
                        message=str(e),
                        code=f"HTTP_{e.response.status_code}",
                        status_code=e.response.status_code,
                    )
            else:
                raise EDUZENNetworkError(message=str(e))

    # ========== 2FA ==========

    def generate_2fa_secret(self) -> Dict[str, Any]:
        """Generate 2FA secret and QR code"""
        return self._request("POST", "/2fa/generate-secret")

    def verify_2fa_activation(self, code: str) -> Dict[str, Any]:
        """Verify 2FA activation code"""
        return self._request("POST", "/2fa/verify-activation", data={"code": code})

    # ========== USERS ==========

    def create_user(
        self,
        email: str,
        full_name: str,
        organization_id: str,
        phone: Optional[str] = None,
        password: Optional[str] = None,
        role: Optional[str] = None,
        is_active: bool = True,
        send_invitation: bool = False,
    ) -> Dict[str, Any]:
        """Create a new user"""
        data = {
            "email": email,
            "full_name": full_name,
            "organization_id": organization_id,
            "phone": phone,
            "password": password,
            "role": role,
            "is_active": is_active,
            "send_invitation": send_invitation,
        }
        return self._request("POST", "/users/create", data={k: v for k, v in data.items() if v is not None})

    # ========== STUDENTS ==========

    def get_students(
        self,
        organization_id: str,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get all students"""
        params = {
            "organization_id": organization_id,
            "page": page,
            "limit": limit,
        }
        if search:
            params["search"] = search
        return self._request("GET", "/v1/students", params=params)

    # ========== PAYMENTS ==========

    def create_stripe_intent(
        self,
        amount: int,
        customer_email: str,
        currency: str = "EUR",
        description: Optional[str] = None,
        customer_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create Stripe payment intent"""
        data = {
            "amount": amount,
            "currency": currency,
            "customer_email": customer_email,
            "description": description,
            "customer_name": customer_name,
            "metadata": metadata,
            "return_url": return_url,
            "cancel_url": cancel_url,
        }
        return self._request("POST", "/payments/stripe/create-intent", data={k: v for k, v in data.items() if v is not None})

    def create_sepa_direct_debit(
        self,
        amount: float,
        debtor_iban: str,
        mandate_id: str,
        creditor_id: str,
        debtor_name: Optional[str] = None,
        debtor_bic: Optional[str] = None,
        reference: Optional[str] = None,
        due_date: Optional[str] = None,
        creditor_name: Optional[str] = None,
        creditor_iban: Optional[str] = None,
        currency: str = "EUR",
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create SEPA direct debit"""
        data = {
            "amount": amount,
            "currency": currency,
            "description": description,
            "debtor_name": debtor_name,
            "debtor_iban": debtor_iban,
            "debtor_bic": debtor_bic,
            "reference": reference,
            "due_date": due_date,
            "mandate_id": mandate_id,
            "creditor_name": creditor_name,
            "creditor_iban": creditor_iban,
            "creditor_id": creditor_id,
        }
        return self._request("POST", "/payments/sepa/create-direct-debit", data={k: v for k, v in data.items() if v is not None})

    def initiate_mobile_money(
        self,
        provider: str,
        amount: int,
        phone_number: str,
        currency: str = "XOF",
        description: Optional[str] = None,
        invoice_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Initiate Mobile Money payment"""
        data = {
            "provider": provider,
            "amount": amount,
            "currency": currency,
            "phone_number": phone_number,
            "description": description,
            "invoice_id": invoice_id,
        }
        return self._request("POST", "/mobile-money/initiate", data={k: v for k, v in data.items() if v is not None})

    # ========== DOCUMENTS ==========

    def generate_document(
        self,
        template_id: str,
        format: str = "pdf",
        variables: Optional[Dict[str, Any]] = None,
        send_email: bool = False,
        email_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate document from template"""
        data = {
            "template_id": template_id,
            "format": format,
            "variables": variables,
            "send_email": send_email,
            "email_to": email_to,
        }
        return self._request("POST", "/documents/generate", data={k: v for k, v in data.items() if v is not None})

    # ========== QR ATTENDANCE ==========

    def generate_qr_code(
        self,
        session_id: str,
        duration_minutes: int = 15,
        max_scans: Optional[int] = None,
        require_location: bool = False,
        allowed_radius_meters: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate QR code for session"""
        data = {
            "session_id": session_id,
            "duration_minutes": duration_minutes,
            "max_scans": max_scans,
            "require_location": require_location,
            "allowed_radius_meters": allowed_radius_meters,
        }
        return self._request("POST", "/qr-attendance/generate", data={k: v for k, v in data.items() if v is not None})

    def scan_qr_code(
        self,
        qr_code: str,
        student_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Scan QR code for attendance"""
        data = {
            "qr_code": qr_code,
            "student_id": student_id,
            "latitude": latitude,
            "longitude": longitude,
        }
        return self._request("POST", "/qr-attendance/scan", data={k: v for k, v in data.items() if v is not None})

    # ========== COMPLIANCE ==========

    def check_compliance_alerts(self) -> Dict[str, Any]:
        """Check compliance alerts"""
        return self._request("POST", "/compliance/alerts/check")

    # ========== SESSIONS ==========

    def get_active_sessions(self) -> Dict[str, Any]:
        """Get active sessions"""
        return self._request("GET", "/sessions/active")

    def configure_timeout_rules(
        self,
        organization_id: str,
        idle_timeout_minutes: Optional[int] = None,
        absolute_timeout_minutes: Optional[int] = None,
        warning_before_timeout_minutes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Configure session timeout rules"""
        data = {
            "organization_id": organization_id,
            "idle_timeout_minutes": idle_timeout_minutes,
            "absolute_timeout_minutes": absolute_timeout_minutes,
            "warning_before_timeout_minutes": warning_before_timeout_minutes,
        }
        return self._request("POST", "/sessions/timeout-rules", data={k: v for k, v in data.items() if v is not None})

    def revoke_session(self, session_id: str) -> Dict[str, Any]:
        """Revoke a session"""
        return self._request("POST", "/sessions/revoke", data={"session_id": session_id})

    # ========== QR ATTENDANCE ==========

    def get_active_qr_code(self, session_id: str) -> Dict[str, Any]:
        """Get active QR code for a session"""
        return self._request("GET", f"/qr-attendance/active/{session_id}")

    def deactivate_qr_code(self, qr_code_id: str) -> Dict[str, Any]:
        """Deactivate a QR code"""
        return self._request("POST", f"/qr-attendance/deactivate/{qr_code_id}")

