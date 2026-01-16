"""
EDUZEN API Exceptions
"""

from typing import Optional, Dict, Any


class EDUZENError(Exception):
    """Base exception for EDUZEN SDK"""

    pass


class EDUZENAPIError(EDUZENError):
    """API error exception"""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(f"[{code}] {message}")


class EDUZENNetworkError(EDUZENError):
    """Network error exception"""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

