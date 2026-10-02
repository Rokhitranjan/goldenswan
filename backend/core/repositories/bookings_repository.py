"""
Bookings Repository for GoldenSwan Hotel.
Handles room reservations, check-ins, check-outs, conflict checks, and date queries.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id, to_decimal128


class BookingsRepository(BaseRepository):
    def __init__(self):
        super().__init__("bookings")

    def get_by_booking_id(self, booking_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"booking_id": booking_id.strip()})

    def generate_booking_id(self) -> str:
        """
        Generates standard sequential-looking booking id: GS-2026-XXXXXX
        """
        year = datetime.now(timezone.utc).year
        count = self.count({}) + 1
        return f"GS-{year}-{count:06d}"

    def check_room_conflict(
        self,
        room_id: Union[str, ObjectId],
        check_in: datetime,
        check_out: datetime,
        exclude_booking_id: Optional[Union[str, ObjectId]] = None,
    ) -> bool:
        """
        Checks if room has an overlapping active booking.
        Active booking means booking_status is in ['RESERVED', 'CHECKED_IN'].
        Overlap logic:
            existing_start < requested_end AND existing_end > requested_start
        Returns True if conflict exists, False if room is available.
        """
        r_oid = to_object_id(room_id)
        if not r_oid:
            return True

        query: Dict[str, Any] = {
            "room_id": r_oid,
            "booking_status": {"$in": ["RESERVED", "CHECKED_IN"]},
            "check_in": {"$lt": check_out},
            "check_out": {"$gt": check_in},
        }

        if exclude_booking_id:
            ex_oid = to_object_id(exclude_booking_id)
            if ex_oid:
                query["_id"] = {"$ne": ex_oid}

        conflict = self.find_one(query)
        return conflict is not None

    def create_booking(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        if not data.get("booking_id"):
            data["booking_id"] = self.generate_booking_id()

        data["customer_id"] = to_object_id(data.get("customer_id"))
        data["room_id"] = to_object_id(data.get("room_id"))

        # Money handling with Decimal128
        data["room_rate"] = to_decimal128(data.get("room_rate", 0))
        data["additional_charges"] = to_decimal128(data.get("additional_charges", 0))
        data["discount"] = to_decimal128(data.get("discount", 0))
        data["tax_amount"] = to_decimal128(data.get("tax_amount", 0))
        data["total_amount"] = to_decimal128(data.get("total_amount", 0))
        data["amount_paid"] = to_decimal128(data.get("amount_paid", 0))
        data["balance_amount"] = to_decimal128(data.get("balance_amount", 0))

        data["booking_status"] = data.get("booking_status", "RESERVED")
        data["payment_status"] = data.get("payment_status", "PENDING")
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)

        return self.insert_one(data)

    def get_today_checkins(self, hotel_tz_offset_hours: int = 5.5) -> List[Dict[str, Any]]:
        """
        Returns bookings scheduled to check-in today.
        """
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)
        query = {
            "check_in": {"$gte": start_of_day, "$lt": end_of_day},
            "booking_status": {"$in": ["RESERVED", "CHECKED_IN"]},
        }
        return self.find(query, sort=[("check_in", 1)])

    def get_today_checkouts(self, hotel_tz_offset_hours: int = 5.5) -> List[Dict[str, Any]]:
        """
        Returns bookings scheduled to check-out today.
        """
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)
        query = {
            "check_out": {"$gte": start_of_day, "$lt": end_of_day},
            "booking_status": "CHECKED_IN",
        }
        return self.find(query, sort=[("check_out", 1)])

    def list_bookings(
        self,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if status:
            query["booking_status"] = status.upper()
        if payment_status:
            query["payment_status"] = payment_status.upper()
        if search_query:
            regex_val = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"booking_id": regex_val},
                {"customer_name": regex_val},
                {"customer_phone": regex_val},
                {"room_number": regex_val},
            ]
        return self.find(query, sort=[("created_at", -1)], limit=limit)


bookings_repo = BookingsRepository()
