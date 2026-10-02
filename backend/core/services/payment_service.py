"""
Payment Service for GoldenSwan Hotel.
Handles financial recording, balance recalculations, and payment receipts.
"""

from typing import Dict, Any, Optional
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from core.repositories import payments_repo, bookings_repo, audit_repo
from core.serializers.mongodb import mongo_to_json, to_decimal128


class PaymentService:
    def record_booking_payment(self, data: Dict[str, Any], user: Optional[Any] = None) -> Dict[str, Any]:
        booking_id = data.get("booking_id")
        booking = bookings_repo.get_by_id(booking_id)
        if not booking:
            raise ValidationError({"booking_id": "Booking not found."})

        amount = Decimal(str(data.get("amount", "0")))
        if amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Payment amount must be greater than zero."})

        current_paid = Decimal(str(booking.get("amount_paid", "0")))
        total_amount = Decimal(str(booking.get("total_amount", "0")))
        current_balance = Decimal(str(booking.get("balance_amount", "0")))

        if amount > current_balance:
            raise ValidationError({"amount": f"Payment cannot exceed remaining balance of ₹{current_balance:,.2f}."})

        new_paid = current_paid + amount
        new_balance = total_amount - new_paid
        new_status = "PAID" if new_balance <= Decimal("0.00") else "PARTIALLY_PAID"

        payment_doc = {
            "booking_id": booking["_id"],
            "booking_code": booking.get("booking_id"),
            "customer_id": booking.get("customer_id"),
            "customer_name": booking.get("customer_name"),
            "amount": to_decimal128(amount),
            "payment_mode": data.get("payment_mode", "CASH").upper(),
            "reference_number": data.get("reference_number", ""),
            "notes": data.get("notes", ""),
            "received_by": user.get("name", "Front Desk") if user else "Front Desk",
        }
        pay_id = payments_repo.create_payment(payment_doc)

        bookings_repo.update_by_id(booking["_id"], {
            "amount_paid": to_decimal128(new_paid),
            "balance_amount": to_decimal128(new_balance),
            "payment_status": new_status,
        })

        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="RECORD_PAYMENT",
            module="PAYMENTS",
            user=user_dict,
            record_id=str(pay_id),
            metadata={
                "booking_id": booking.get("booking_id"),
                "amount": float(amount),
                "remaining_balance": float(new_balance),
            },
        )

        created_pay = payments_repo.get_by_id(pay_id)
        return mongo_to_json(created_pay)


payment_service = PaymentService()
