"""
DRF Serializers for GoldenSwan Hotel.
Uses serializers.Serializer for input validation and schema contracts.
No Django ORM ModelSerializer dependencies.
"""

from decimal import Decimal
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=[
            "SUPER_ADMIN",
            "HOTEL_ADMIN",
            "MANAGER",
            "RECEPTIONIST",
            "ACCOUNTANT",
            "HR_MANAGER",
            "VIEWER",
        ],
        default="RECEPTIONIST",
    )
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class RoomTypeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class RoomSerializer(serializers.Serializer):
    room_number = serializers.CharField(max_length=20)
    room_type_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    floor = serializers.IntegerField(default=1, min_value=0)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    capacity = serializers.IntegerField(default=2, min_value=1)
    status = serializers.ChoiceField(
        choices=["AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE"],
        default="AVAILABLE",
    )
    description = serializers.CharField(required=False, allow_blank=True)
    amenities = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class RoomStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE"])


class CustomerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    id_proof_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    id_proof_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=50, required=False, default="Indian")
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("name") and not attrs.get("full_name"):
            raise serializers.ValidationError({"name": "Customer name is required."})
        if not attrs.get("name"):
            attrs["name"] = attrs.get("full_name")
        if not attrs.get("full_name"):
            attrs["full_name"] = attrs.get("name")
        return attrs


class BookingCreateSerializer(serializers.Serializer):
    room_id = serializers.CharField()
    customer_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # Inline customer creation fields if customer_id not selected
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_address = serializers.CharField(required=False, allow_blank=True)
    id_proof_type = serializers.CharField(required=False, allow_blank=True)
    id_proof_number = serializers.CharField(required=False, allow_blank=True)

    check_in = serializers.DateTimeField()
    check_out = serializers.DateTimeField()
    guests = serializers.IntegerField(default=1, min_value=1)
    room_rate = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    additional_charges = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0.0)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0.0)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0.0)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0.0)
    payment_mode = serializers.CharField(required=False, default="CASH")
    payment_reference = serializers.CharField(required=False, allow_blank=True)
    booking_status = serializers.ChoiceField(
        choices=["RESERVED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"],
        default="RESERVED",
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class CheckInSerializer(serializers.Serializer):
    booking_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, default=0.0)
    payment_mode = serializers.ChoiceField(
        choices=["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "OTHER"],
        default="CASH",
        required=False,
    )
    reference_number = serializers.CharField(required=False, allow_blank=True)


class CheckOutSerializer(serializers.Serializer):
    booking_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, default=0.0)
    payment_mode = serializers.ChoiceField(
        choices=["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "OTHER"],
        default="CASH",
        required=False,
    )
    reference_number = serializers.CharField(required=False, allow_blank=True)
    allow_unsettled_balance = serializers.BooleanField(default=False, required=False)


class PaymentSerializer(serializers.Serializer):
    booking_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    payment_mode = serializers.ChoiceField(
        choices=["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "OTHER"],
        default="CASH",
    )
    reference_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExpenseCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)


class ExpenseSerializer(serializers.Serializer):
    date = serializers.DateTimeField(required=False)
    category_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0)
    payment_mode = serializers.ChoiceField(
        choices=["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "NET_BANKING", "OTHER"],
        default="CASH",
    )
    remarks = serializers.CharField(required=False, allow_blank=True)


class VendorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    contact_person = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    gst_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class SiteExpenseSerializer(serializers.Serializer):
    date = serializers.DateTimeField(required=False)
    category = serializers.CharField(default="General")
    vendor_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    vendor_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0)
    payment_mode = serializers.ChoiceField(
        choices=["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "NET_BANKING", "CHEQUE", "OTHER"],
        default="CASH",
    )
    remarks = serializers.CharField(required=False, allow_blank=True)


class StaffSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    position = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100, default="Front Desk")
    salary = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    employment_status = serializers.ChoiceField(
        choices=["ACTIVE", "INACTIVE", "TERMINATED"],
        default="ACTIVE",
    )
    joining_date = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class AttendanceSerializer(serializers.Serializer):
    staff_id = serializers.CharField()
    date = serializers.CharField(max_length=10) # YYYY-MM-DD
    status = serializers.ChoiceField(choices=["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"])
    check_in_time = serializers.CharField(required=False, allow_blank=True)
    check_out_time = serializers.CharField(required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)


class ProcessPayrollSerializer(serializers.Serializer):
    staff_id = serializers.CharField()
    year = serializers.IntegerField(min_value=2020, max_value=2050)
    month = serializers.IntegerField(min_value=1, max_value=12)
    overtime_hours = serializers.FloatField(min_value=0, default=0.0)
    bonus = serializers.FloatField(min_value=0, default=0.0)
    other_adjustment = serializers.FloatField(default=0.0)
    remarks = serializers.CharField(required=False, allow_blank=True)
