"""
GoldenSwan Services Module.
Encapsulates business rules and multi-collection workflows.
"""

from core.services.booking_service import booking_service
from core.services.payment_service import payment_service
from core.services.expense_service import expense_service
from core.services.payroll_service import payroll_service
from core.services.report_service import report_service

__all__ = [
    "booking_service",
    "payment_service",
    "expense_service",
    "payroll_service",
    "report_service",
]
