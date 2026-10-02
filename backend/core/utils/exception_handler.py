"""
Centralized API Exception Handling for GoldenSwan Hotel.
Sanitizes technical errors and MongoDB exceptions so sensitive paths or credentials are never leaked.
Returns standard:
{
    "success": False,
    "message": "...",
    "errors": {...}
}
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from pymongo.errors import PyMongoError, DuplicateKeyError, ConnectionFailure

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    Ensures consistent error JSON format across all APIs.
    """
    # Call DRF's default exception handler first to get standard error response if available
    response = exception_handler(exc, context)

    view_name = context.get("view", None)
    logger.error("API Exception in %s: %s", view_name, str(exc), exc_info=True)

    if isinstance(exc, DuplicateKeyError):
        return Response(
            {
                "success": False,
                "message": "A record with this identifier or unique field already exists.",
                "errors": {"detail": "Duplicate record key error"},
            },
            status=status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, ConnectionFailure):
        return Response(
            {
                "success": False,
                "message": "Unable to connect to the database. Please try again shortly.",
                "errors": {"detail": "Database connection error"},
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if isinstance(exc, PyMongoError):
        return Response(
            {
                "success": False,
                "message": "A database operation error occurred.",
                "errors": {"detail": "Database error"},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response is not None:
        message = "An error occurred while processing the request."
        errors = response.data

        if isinstance(response.data, dict):
            if "detail" in response.data:
                message = str(response.data["detail"])
            elif "message" in response.data:
                message = str(response.data["message"])
            else:
                first_key = next(iter(response.data))
                first_val = response.data[first_key]
                if isinstance(first_val, list) and len(first_val) > 0:
                    message = f"{first_key}: {first_val[0]}"
                else:
                    message = f"{first_key}: {first_val}"

        elif isinstance(response.data, list) and len(response.data) > 0:
            message = str(response.data[0])

        return Response(
            {
                "success": False,
                "message": message,
                "errors": errors,
            },
            status=response.status_code,
        )

    # Unhandled generic Python exception
    return Response(
        {
            "success": False,
            "message": "An unexpected server error occurred. Please contact the administrator.",
            "errors": {"detail": "Internal server error"},
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
