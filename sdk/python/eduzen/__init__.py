"""
EDUZEN API SDK - Python
"""

__version__ = "1.0.0"

from .client import EDUZENClient
from .exceptions import EDUZENError, EDUZENAPIError, EDUZENNetworkError

__all__ = [
    "EDUZENClient",
    "EDUZENError",
    "EDUZENAPIError",
    "EDUZENNetworkError",
]





