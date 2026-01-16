"""
Tests unitaires pour EDUZENClient
"""

import unittest
from unittest.mock import Mock, patch
from eduzen import EDUZENClient, EDUZENAPIError, EDUZENNetworkError
import requests


class TestEDUZENClient(unittest.TestCase):
    def setUp(self):
        self.client = EDUZENClient(
            base_url="https://app.eduzen.com/api",
            api_key="test-api-key",
        )

    @patch("requests.request")
    def test_generate_2fa_secret(self, mock_request):
        """Test generation of 2FA secret"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "secret": "JBSWY3DPEHPK3PXP",
            "qrCodeUrl": "data:image/png;base64,...",
            "backupCodes": ["A1B2C3D4", "E5F6G7H8"],
        }
        mock_response.raise_for_status = Mock()
        mock_request.return_value = mock_response

        result = self.client.generate_2fa_secret()

        self.assertEqual(result["secret"], "JBSWY3DPEHPK3PXP")
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        self.assertEqual(call_args[0][0], "POST")
        self.assertIn("/2fa/generate-secret", call_args[0][1])

    @patch("requests.request")
    def test_create_user(self, mock_request):
        """Test user creation"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "user-123",
                "email": "teacher@example.com",
                "full_name": "Jane Smith",
                "role": "teacher",
                "is_active": True,
            },
            "message": "Utilisateur créé avec succès",
        }
        mock_response.raise_for_status = Mock()
        mock_request.return_value = mock_response

        result = self.client.create_user(
            email="teacher@example.com",
            full_name="Jane Smith",
            organization_id="org-123",
            role="teacher",
        )

        self.assertEqual(result["user"]["email"], "teacher@example.com")
        mock_request.assert_called_once()

    @patch("requests.request")
    def test_get_students(self, mock_request):
        """Test getting students"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "student-123",
                    "first_name": "Jane",
                    "last_name": "Doe",
                    "student_number": "ORG-24-0001",
                    "email": "jane@example.com",
                    "status": "active",
                }
            ],
            "pagination": {
                "currentPage": 1,
                "pageSize": 10,
                "totalItems": 1,
                "totalPages": 1,
                "hasNextPage": False,
                "hasPreviousPage": False,
            },
        }
        mock_response.raise_for_status = Mock()
        mock_request.return_value = mock_response

        result = self.client.get_students(
            organization_id="org-123",
            page=1,
            limit=10,
        )

        self.assertEqual(len(result["data"]), 1)
        self.assertEqual(result["data"][0]["email"], "jane@example.com")

    @patch("requests.request")
    def test_api_error_handling(self, mock_request):
        """Test API error handling"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": "Validation error",
            "code": "VALIDATION_ERROR",
            "details": {"field": "email", "message": "Email invalide"},
        }
        mock_response.status_code = 400
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            response=mock_response
        )
        mock_request.return_value = mock_response

        with self.assertRaises(EDUZENAPIError) as context:
            self.client.create_user(
                email="invalid-email",
                full_name="Test",
                organization_id="org-123",
            )

        self.assertEqual(context.exception.code, "VALIDATION_ERROR")
        self.assertEqual(context.exception.status_code, 400)

    @patch("requests.request")
    def test_network_error_handling(self, mock_request):
        """Test network error handling"""
        mock_request.side_effect = requests.exceptions.RequestException("Network error")

        with self.assertRaises(EDUZENNetworkError) as context:
            self.client.get_students(organization_id="org-123")

        self.assertIn("Network error", str(context.exception))


if __name__ == "__main__":
    unittest.main()





