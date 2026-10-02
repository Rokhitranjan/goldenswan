"""
Payroll Service for GoldenSwan Hotel.
Calculates staff compensation based on attendance, deductions, overtime, and bonuses.
Enforces that final payroll calculations are performed exclusively on the backend.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal
import calendar
from rest_framework.exceptions import ValidationError
from core.repositories import staff_repo, attendance_repo, payroll_repo, audit_repo
from core.serializers.mongodb import mongo_to_json, to_decimal128


class PayrollService:
    def process_staff_payroll(
        self,
        staff_id: str,
        year: int,
        month: int,
        overtime_hours: float = 0.0,
        bonus: float = 0.0,
        other_adjustment: float = 0.0,
        remarks: str = "",
        user: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Calculates and saves monthly payroll for an employee based on logged attendance.
        """
        staff_member = staff_repo.get_by_staff_id(staff_id)
        if not staff_member:
            raise ValidationError({"staff_id": "Staff member not found."})

        base_salary = Decimal(str(staff_member.get("salary", "0")))

        # Get attendance records for this month
        attendance_records = attendance_repo.get_monthly_staff_attendance(staff_id, year, month)

        # Count days in month
        _, days_in_month = calendar.monthrange(year, month)
        present_days = sum(1 for a in attendance_records if a.get("status") == "PRESENT")
        half_days = sum(1 for a in attendance_records if a.get("status") == "HALF_DAY")
        leave_days = sum(1 for a in attendance_records if a.get("status") == "LEAVE")
        absent_days = sum(1 for a in attendance_records if a.get("status") == "ABSENT")

        # Daily rate based on 30 standard days or days in month
        daily_rate = base_salary / Decimal(str(max(1, days_in_month)))
        hourly_rate = daily_rate / Decimal("8.0")

        # Overtime calculation (1.5x standard hourly rate)
        overtime_hours_dec = Decimal(str(overtime_hours))
        overtime_amount = (hourly_rate * Decimal("1.5") * overtime_hours_dec).quantize(Decimal("0.01"))

        # Deductions for unpaid absences and half-days
        deduction = ((Decimal(str(absent_days)) * daily_rate) + (Decimal(str(half_days)) * (daily_rate / Decimal("2.0")))).quantize(Decimal("0.01"))

        bonus_dec = Decimal(str(bonus)).quantize(Decimal("0.01"))
        other_adj_dec = Decimal(str(other_adjustment)).quantize(Decimal("0.01"))

        # Final payable formula: Base Salary - Deduction + Overtime + Bonus + Other Adjustments
        final_payable = base_salary - deduction + overtime_amount + bonus_dec + other_adj_dec
        if final_payable < Decimal("0.00"):
            final_payable = Decimal("0.00")

        payroll_doc = {
            "staff_id": staff_id,
            "staff_name": staff_member.get("name"),
            "department": staff_member.get("department", "General"),
            "year": year,
            "month": month,
            "base_salary": to_decimal128(base_salary),
            "present_days": present_days,
            "absent_days": absent_days,
            "leave_days": leave_days,
            "half_days": half_days,
            "overtime_hours": float(overtime_hours),
            "overtime_amount": to_decimal128(overtime_amount),
            "deduction": to_decimal128(deduction),
            "bonus": to_decimal128(bonus_dec),
            "other_adjustment": to_decimal128(other_adj_dec),
            "final_payable_salary": to_decimal128(final_payable),
            "payment_status": "PENDING",
            "remarks": remarks,
        }

        pid = payroll_repo.create_or_update_payroll(payroll_doc)

        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="PROCESS_PAYROLL",
            module="PAYROLL",
            user=user_dict,
            record_id=str(pid),
            metadata={
                "staff_id": staff_id,
                "staff_name": staff_member.get("name"),
                "month": month,
                "year": year,
                "final_payable": float(final_payable),
            },
        )

        return mongo_to_json(payroll_repo.get_by_id(pid))

    def mark_payroll_paid(
        self,
        payroll_id: str,
        payment_mode: str = "BANK_TRANSFER",
        user: Optional[Any] = None,
    ) -> Dict[str, Any]:
        payroll_doc = payroll_repo.get_by_id(payroll_id)
        if not payroll_doc:
            raise ValidationError({"payroll_id": "Payroll record not found."})

        now = datetime.now(timezone.utc)
        payroll_repo.update_by_id(payroll_doc["_id"], {
            "payment_status": "PAID",
            "payment_date": now,
            "payment_mode": payment_mode.upper(),
            "updated_at": now,
        })

        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="PAY_PAYROLL",
            module="PAYROLL",
            user=user_dict,
            record_id=str(payroll_doc["_id"]),
            metadata={
                "staff_id": payroll_doc.get("staff_id"),
                "amount": float(str(payroll_doc.get("final_payable_salary", "0"))),
            },
        )

        return mongo_to_json(payroll_repo.get_by_id(payroll_doc["_id"]))


payroll_service = PayrollService()
