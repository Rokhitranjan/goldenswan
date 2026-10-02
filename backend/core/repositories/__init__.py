"""
GoldenSwan Repositories Module.
Encapsulates MongoDB collections and queries.
"""

from core.repositories.users_repository import users_repo
from core.repositories.rooms_repository import rooms_repo
from core.repositories.room_types_repository import room_types_repo
from core.repositories.customers_repository import customers_repo
from core.repositories.bookings_repository import bookings_repo
from core.repositories.payments_repository import payments_repo
from core.repositories.expenses_repository import expenses_repo
from core.repositories.expense_categories_repository import expense_categories_repo
from core.repositories.site_expenses_repository import site_expenses_repo
from core.repositories.vendors_repository import vendors_repo
from core.repositories.staff_repository import staff_repo
from core.repositories.attendance_repository import attendance_repo
from core.repositories.payroll_repository import payroll_repo
from core.repositories.notifications_repository import notifications_repo
from core.repositories.audit_repository import audit_repo
from core.repositories.dashboard_repository import dashboard_repo

__all__ = [
    "users_repo",
    "rooms_repo",
    "room_types_repo",
    "customers_repo",
    "bookings_repo",
    "payments_repo",
    "expenses_repo",
    "expense_categories_repo",
    "site_expenses_repo",
    "vendors_repo",
    "staff_repo",
    "attendance_repo",
    "payroll_repo",
    "notifications_repo",
    "audit_repo",
    "dashboard_repo",
]
