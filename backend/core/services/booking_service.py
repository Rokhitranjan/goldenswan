"""
Booking Service for GoldenSwan Hotel.
Implements business rules for reservations, room availability checks, check-in, check-out,
financial recalculations, room status lifecycle, and audit logging.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from core.repositories import (
    rooms_repo,
    bookings_repo,
    customers_repo,
    payments_repo,
    audit_repo,
    notifications_repo,
)
from core.serializers.mongodb import to_object_id, to_decimal128, mongo_to_json


class BookingService:
    def create_booking(self, validated_data: Dict[str, Any], user: Optional[Any] = None) -> Dict[str, Any]:
        """
        Creates a new room reservation.
        Validates room availability, dates, calculates financial totals, updates room status,
        and logs audit trail.
        """
        room_id = validated_data.get("room_id")
        room = rooms_repo.get_by_id(room_id)
        if not room or not room.get("active", True):
            raise ValidationError({"room_id": "Selected room does not exist or is inactive."})

        # Parse dates
        check_in = validated_data["check_in"]
        check_out = validated_data["check_out"]

        if isinstance(check_in, str):
            check_in = datetime.fromisoformat(check_in.replace("Z", "+00:00"))
        if isinstance(check_out, str):
            check_out = datetime.fromisoformat(check_out.replace("Z", "+00:00"))

        if check_in.tzinfo is None:
            check_in = check_in.replace(tzinfo=timezone.utc)
        if check_out.tzinfo is None:
            check_out = check_out.replace(tzinfo=timezone.utc)

        if check_out <= check_in:
            raise ValidationError({"check_out": "Check-out time must be after check-in time."})

        # Check booking conflicts
        has_conflict = bookings_repo.check_room_conflict(room_id, check_in, check_out)
        if has_conflict:
            raise ValidationError({
                "room_id": f"Room {room.get('room_number')} is already booked or occupied for the selected dates."
            })

        # Calculate nights
        diff_days = (check_out.date() - check_in.date()).days
        nights = max(1, diff_days)

        room_rate = Decimal(str(validated_data.get("room_rate", float(str(room.get("price", "0"))))))
        additional_charges = Decimal(str(validated_data.get("additional_charges", "0.00")))
        discount = Decimal(str(validated_data.get("discount", "0.00")))
        tax_amount = Decimal(str(validated_data.get("tax_amount", "0.00")))
        amount_paid = Decimal(str(validated_data.get("amount_paid", "0.00")))

        # Financial formulas
        base_charges = (room_rate * Decimal(nights))
        total_amount = base_charges + additional_charges + tax_amount - discount
        if total_amount < Decimal("0.00"):
            total_amount = Decimal("0.00")

        if amount_paid > total_amount:
            raise ValidationError({"amount_paid": "Amount paid cannot exceed total booking amount."})

        balance_amount = total_amount - amount_paid

        # Determine payment status
        if amount_paid >= total_amount and total_amount > 0:
            payment_status = "PAID"
        elif amount_paid > 0:
            payment_status = "PARTIALLY_PAID"
        else:
            payment_status = "PENDING"

        # Customer handling
        customer_id = validated_data.get("customer_id")
        customer = customers_repo.get_by_id(customer_id) if customer_id else None
        if not customer:
            # If customer details provided inline, create customer
            cust_name = validated_data.get("customer_name")
            cust_phone = validated_data.get("customer_phone")
            if not cust_name or not cust_phone:
                raise ValidationError({"customer": "Valid customer ID or customer name & phone required."})
            cust_id = customers_repo.create_customer({
                "name": cust_name,
                "phone": cust_phone,
                "email": validated_data.get("customer_email", ""),
                "address": validated_data.get("customer_address", ""),
                "id_proof_type": validated_data.get("id_proof_type", ""),
                "id_proof_number": validated_data.get("id_proof_number", ""),
            })
            customer = customers_repo.get_by_id(cust_id)
            customer_id = cust_id

        booking_status = validated_data.get("booking_status", "RESERVED").upper()

        booking_doc = {
            "customer_id": to_object_id(customer_id),
            "customer_name": customer.get("name"),
            "customer_phone": customer.get("phone"),
            "room_id": to_object_id(room["_id"]),
            "room_number": room["room_number"],
            "check_in": check_in,
            "check_out": check_out,
            "guests": int(validated_data.get("guests", 1)),
            "room_rate": to_decimal128(room_rate),
            "nights": nights,
            "additional_charges": to_decimal128(additional_charges),
            "discount": to_decimal128(discount),
            "tax_amount": to_decimal128(tax_amount),
            "total_amount": to_decimal128(total_amount),
            "amount_paid": to_decimal128(amount_paid),
            "balance_amount": to_decimal128(balance_amount),
            "payment_status": payment_status,
            "booking_status": booking_status,
            "notes": validated_data.get("notes", ""),
        }

        created_id = bookings_repo.create_booking(booking_doc)
        created_booking = bookings_repo.get_by_id(created_id)

        # If payment made during reservation, create payment record
        if amount_paid > Decimal("0.00"):
            payments_repo.create_payment({
                "booking_id": created_id,
                "booking_code": created_booking.get("booking_id"),
                "customer_id": customer_id,
                "customer_name": customer.get("name"),
                "amount": to_decimal128(amount_paid),
                "payment_mode": validated_data.get("payment_mode", "CASH"),
                "reference_number": validated_data.get("payment_reference", ""),
                "notes": "Initial deposit / booking payment",
                "received_by": user.get("name", "Front Desk") if user else "Front Desk",
            })

        # Update room status
        if booking_status == "CHECKED_IN":
            rooms_repo.update_status(room["_id"], "OCCUPIED")
        elif booking_status == "RESERVED":
            # If checking in today, mark room as RESERVED
            rooms_repo.update_status(room["_id"], "RESERVED")

        # Audit log
        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="CREATE_BOOKING",
            module="BOOKINGS",
            user=user_dict,
            record_id=str(created_id),
            metadata={
                "booking_id": created_booking.get("booking_id"),
                "room_number": room["room_number"],
                "total_amount": float(total_amount),
                "amount_paid": float(amount_paid),
            },
        )

        notifications_repo.create_notification(
            title="New Booking Created",
            message=f"Booking {created_booking.get('booking_id')} for Room {room['room_number']} ({customer.get('name')})",
            notif_type="INFO",
            link="/bookings",
        )

        return mongo_to_json(created_booking)

    def check_in(self, booking_id: str, payment_data: Optional[Dict[str, Any]] = None, user: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes dedicated check-in workflow.
        Changes booking status to CHECKED_IN, room status to OCCUPIED, records payment if supplied,
        updates financial balance, and records audit trail.
        """
        booking = bookings_repo.get_by_id(booking_id)
        if not booking:
            raise ValidationError({"booking_id": "Booking not found."})

        if booking.get("booking_status") == "CHECKED_IN":
            raise ValidationError({"detail": "This booking is already checked in."})
        if booking.get("booking_status") in ["CHECKED_OUT", "CANCELLED"]:
            raise ValidationError({"detail": f"Cannot check in booking in {booking.get('booking_status')} status."})

        # Process optional check-in payment
        if payment_data and payment_data.get("amount"):
            pay_amount = Decimal(str(payment_data.get("amount", "0")))
            if pay_amount > 0:
                current_paid = Decimal(str(booking.get("amount_paid", "0")))
                total = Decimal(str(booking.get("total_amount", "0")))
                new_paid = current_paid + pay_amount

                if new_paid > total:
                    raise ValidationError({"amount": "Payment exceeds remaining booking balance."})

                new_balance = total - new_paid
                new_pay_status = "PAID" if new_balance <= 0 else "PARTIALLY_PAID"

                payments_repo.create_payment({
                    "booking_id": booking["_id"],
                    "booking_code": booking.get("booking_id"),
                    "customer_id": booking.get("customer_id"),
                    "customer_name": booking.get("customer_name"),
                    "amount": to_decimal128(pay_amount),
                    "payment_mode": payment_data.get("payment_mode", "CASH"),
                    "reference_number": payment_data.get("reference_number", ""),
                    "notes": "Check-in payment",
                    "received_by": user.get("name", "Front Desk") if user else "Front Desk",
                })

                bookings_repo.update_by_id(booking["_id"], {
                    "amount_paid": to_decimal128(new_paid),
                    "balance_amount": to_decimal128(new_balance),
                    "payment_status": new_pay_status,
                })

        # Update booking status
        bookings_repo.update_by_id(booking["_id"], {
            "booking_status": "CHECKED_IN",
            "actual_check_in": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })

        # Update room status to OCCUPIED
        rooms_repo.update_status(booking["room_id"], "OCCUPIED")

        # Audit log
        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="CHECK_IN",
            module="BOOKINGS",
            user=user_dict,
            record_id=str(booking["_id"]),
            metadata={
                "booking_id": booking.get("booking_id"),
                "room_number": booking.get("room_number"),
            },
        )

        updated_booking = bookings_repo.get_by_id(booking["_id"])
        return mongo_to_json(updated_booking)

    def check_out(self, booking_id: str, payment_data: Optional[Dict[str, Any]] = None, user: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes dedicated check-out workflow.
        Verifies balance settlement, updates booking to CHECKED_OUT,
        updates room status to CLEANING, and records audit trail.
        """
        booking = bookings_repo.get_by_id(booking_id)
        if not booking:
            raise ValidationError({"booking_id": "Booking not found."})

        if booking.get("booking_status") != "CHECKED_IN":
            raise ValidationError({"detail": f"Cannot check out booking with status {booking.get('booking_status')}."})

        current_balance = Decimal(str(booking.get("balance_amount", "0")))

        # If payment supplied at checkout
        if payment_data and payment_data.get("amount"):
            pay_amount = Decimal(str(payment_data.get("amount", "0")))
            if pay_amount > 0:
                current_paid = Decimal(str(booking.get("amount_paid", "0")))
                total = Decimal(str(booking.get("total_amount", "0")))
                new_paid = current_paid + pay_amount

                if new_paid > total:
                    raise ValidationError({"amount": "Payment exceeds remaining balance."})

                current_balance = total - new_paid
                new_pay_status = "PAID" if current_balance <= 0 else "PARTIALLY_PAID"

                payments_repo.create_payment({
                    "booking_id": booking["_id"],
                    "booking_code": booking.get("booking_id"),
                    "customer_id": booking.get("customer_id"),
                    "customer_name": booking.get("customer_name"),
                    "amount": to_decimal128(pay_amount),
                    "payment_mode": payment_data.get("payment_mode", "CASH"),
                    "reference_number": payment_data.get("reference_number", ""),
                    "notes": "Checkout settlement payment",
                    "received_by": user.get("name", "Front Desk") if user else "Front Desk",
                })

                bookings_repo.update_by_id(booking["_id"], {
                    "amount_paid": to_decimal128(new_paid),
                    "balance_amount": to_decimal128(current_balance),
                    "payment_status": new_pay_status,
                })

        # Prevent checkout if required payment rules violated
        if current_balance > Decimal("0.00"):
            allow_partial = payment_data.get("allow_unsettled_balance", False) if payment_data else False
            if not allow_partial:
                raise ValidationError({
                    "detail": f"Pending balance of ₹{current_balance:,.2f} must be settled prior to check-out."
                })

        # Update booking status to CHECKED_OUT
        bookings_repo.update_by_id(booking["_id"], {
            "booking_status": "CHECKED_OUT",
            "actual_check_out": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })

        # Update room status to CLEANING
        rooms_repo.update_status(booking["room_id"], "CLEANING")

        # Audit log
        user_dict = user.to_dict() if hasattr(user, "to_dict") else (user if isinstance(user, dict) else None)
        audit_repo.log_event(
            action="CHECK_OUT",
            module="BOOKINGS",
            user=user_dict,
            record_id=str(booking["_id"]),
            metadata={
                "booking_id": booking.get("booking_id"),
                "room_number": booking.get("room_number"),
            },
        )

        updated_booking = bookings_repo.get_by_id(booking["_id"])
        return mongo_to_json(updated_booking)


booking_service = BookingService()
