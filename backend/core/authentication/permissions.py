"""
Role-Based Access Control Permissions for GoldenSwan Hotel.
Enforces permissions on the backend according to role hierarchies and functional capabilities.
"""

from typing import List
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class IsAuthenticatedMongoUser(BasePermission):
    """Allows access only to authenticated MongoDB users."""

    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_authenticated", False))


def role_required(allowed_roles: List[str]):
    """
    Factory function returning a DRF Permission class that permits only specified roles.
    SUPER_ADMIN always has full access.
    """

    class RolePermission(BasePermission):
        def has_permission(self, request, view):
            if not (request.user and getattr(request.user, "is_authenticated", False)):
                return False
            user_role = getattr(request.user, "role", "VIEWER")
            if user_role == "SUPER_ADMIN":
                return True
            return user_role in allowed_roles

    return RolePermission


# Predefined convenient permission classes
class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", "") == "SUPER_ADMIN"
        )


class IsManagerOrAbove(BasePermission):
    ALLOWED = ["SUPER_ADMIN", "HOTEL_ADMIN", "MANAGER"]

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", "") in self.ALLOWED
        )


class CanManageFrontDesk(BasePermission):
    """
    Receptionists, Managers, Hotel Admins, and Super Admins can manage
    rooms, bookings, check-in, check-out, and guest payments.
    """
    ALLOWED = ["SUPER_ADMIN", "HOTEL_ADMIN", "MANAGER", "RECEPTIONIST"]

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", "") in self.ALLOWED
        )


class CanManageFinance(BasePermission):
    """
    Accountants, Managers, Hotel Admins, and Super Admins can manage
    expenses, site expenses, vendor payments, and financial reports.
    """
    ALLOWED = ["SUPER_ADMIN", "HOTEL_ADMIN", "MANAGER", "ACCOUNTANT"]

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", "") in self.ALLOWED
        )


class CanManageHR(BasePermission):
    """
    HR Managers, Hotel Admins, and Super Admins can manage staff directory,
    attendance, and payroll.
    """
    ALLOWED = ["SUPER_ADMIN", "HOTEL_ADMIN", "HR_MANAGER"]

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", "") in self.ALLOWED
        )
