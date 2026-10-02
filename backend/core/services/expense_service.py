"""
Expense Service for GoldenSwan Hotel.
Implements financial logic for daily hotel operating expenses and site/vendor contracts.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from core.repositories import (
    expenses_repo,
    expense_categories_repo,
    site_expenses_repo,
    vendors_repo,
    audit_repo,
)
from core.serializers.mongodb import mongo_to_json, to_decimal128, to_object_id


class ExpenseService:
    def create_daily_expense(self, data: Dict[str, Any], user: Optional[Any] = None) -> Dict[str, Any]:
        total_amount = Decimal(str(data.get("total_amount", "0")))
        amount_paid = Decimal(str(data.get("amount_paid", "0")))

        if total_amount <= Decimal("0.00"):
            raise ValidationError({"total_amount": "Total amount must be greater than zero."})
        if amount_paid < Decimal("0.00"):
            raise ValidationError({"amount_paid": "Amount paid cannot be negative."})
        if amount_paid > total_amount:
            raise ValidationError({"amount_paid": "Amount paid cannot exceed total expense amount."})

        balance = total_amount - amount_paid
        if amount_paid >= total_amount:
            payment_status = "PAID"
        elif amount_paid > Decimal("0.00"):
            payment_status = "PARTIALLY_PAID"
        else:
            payment_status = "UNPAID"

        # Resolve category
        category_name = data.get("category_name", "").strip()
        category_id = data.get("category_id")
        if not category_name and category_id:
            cat = expense_categories_repo.get_by_id(category_id)
            if cat:
                category_name = cat.get("name", "")

        date_val = data.get("date")
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
        if not date_val:
            date_val = datetime.now(timezone.utc)
        elif date_val.tzinfo is None:
            date_val = date_val.replace(tzinfo=timezone.utc)

        expense_doc = {
            "date": date_val,
            "category_id": to_object_id(category_id),
            "category_name": category_name or "General",
            "description": data.get("description", "").strip(),
            "total_amount": to_decimal128(total_amount),
            "amount_paid": to_decimal128(amount_paid),
            "balance": to_decimal128(balance),
            "payment_status": payment_status,
            "payment_mode": data.get("payment_mode", "CASH").upper(),
            "remarks": data.get("remarks", ""),
            "created_by": user.get("name", "Accountant") if user else "System",
        }

        exp_id = expenses_repo.create_expense(expense_doc)

        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="CREATE_EXPENSE",
            module="EXPENSES",
            user=user_dict,
            record_id=str(exp_id),
            metadata={"category": category_name, "total_amount": float(total_amount)},
        )

        return mongo_to_json(expenses_repo.get_by_id(exp_id))

    def create_site_expense(self, data: Dict[str, Any], user: Optional[Any] = None) -> Dict[str, Any]:
        total_amount = Decimal(str(data.get("total_amount", "0")))
        amount_paid = Decimal(str(data.get("amount_paid", "0")))

        if total_amount <= Decimal("0.00"):
            raise ValidationError({"total_amount": "Total amount must be greater than zero."})
        if amount_paid < Decimal("0.00"):
            raise ValidationError({"amount_paid": "Amount paid cannot be negative."})
        if amount_paid > total_amount:
            raise ValidationError({"amount_paid": "Amount paid cannot exceed total expense amount."})

        balance = total_amount - amount_paid
        if amount_paid >= total_amount:
            payment_status = "PAID"
        elif amount_paid > Decimal("0.00"):
            payment_status = "PARTIALLY_PAID"
        else:
            payment_status = "UNPAID"

        # Resolve vendor
        vendor_id = data.get("vendor_id")
        vendor_name = data.get("vendor_name", "")
        if vendor_id and not vendor_name:
            v = vendors_repo.get_by_id(vendor_id)
            if v:
                vendor_name = v.get("name", "")

        date_val = data.get("date")
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
        if not date_val:
            date_val = datetime.now(timezone.utc)
        elif date_val.tzinfo is None:
            date_val = date_val.replace(tzinfo=timezone.utc)

        site_doc = {
            "date": date_val,
            "category": data.get("category", "General"),
            "vendor_id": to_object_id(vendor_id),
            "vendor_name": vendor_name or "Vendor",
            "description": data.get("description", "").strip(),
            "total_amount": to_decimal128(total_amount),
            "amount_paid": to_decimal128(amount_paid),
            "balance": to_decimal128(balance),
            "payment_status": payment_status,
            "payment_mode": data.get("payment_mode", "CASH").upper(),
            "remarks": data.get("remarks", ""),
            "created_by": user.get("name", "Accountant") if user else "System",
        }

        sid = site_expenses_repo.create_site_expense(site_doc)

        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="CREATE_SITE_EXPENSE",
            module="SITE_EXPENSES",
            user=user_dict,
            record_id=str(sid),
            metadata={"vendor": vendor_name, "total_amount": float(total_amount)},
        )

        return mongo_to_json(site_expenses_repo.get_by_id(sid))


expense_service = ExpenseService()
