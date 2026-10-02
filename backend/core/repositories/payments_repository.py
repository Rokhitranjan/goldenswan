"""
Payments Repository for GoldenSwan Hotel.
Handles room booking payments, receipts, and revenue calculations.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id, to_decimal128


class PaymentsRepository(BaseRepository):
    def __init__(self):
        super().__init__("payments")

    def generate_payment_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = self.count({}) + 1
        return f"PAY-{year}-{count:06d}"

    def create_payment(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        if not data.get("payment_id"):
            data["payment_id"] = self.generate_payment_id()

        data["booking_id"] = to_object_id(data.get("booking_id"))
        data["customer_id"] = to_object_id(data.get("customer_id"))
        data["amount"] = to_decimal128(data.get("amount", 0))
        data["payment_date"] = data.get("payment_date", now)
        data["payment_mode"] = data.get("payment_mode", "CASH").upper()
        data["created_at"] = data.get("created_at", now)

        return self.insert_one(data)

    def get_by_booking(self, booking_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        oid = to_object_id(booking_id)
        if not oid:
            return []
        return self.find({"booking_id": oid}, sort=[("payment_date", 1)])

    def get_customer_payments(self, customer_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        oid = to_object_id(customer_id)
        if not oid:
            return []
        return self.find({"customer_id": oid}, sort=[("payment_date", -1)])

    def get_total_revenue_range(self, start_date: datetime, end_date: datetime) -> float:
        pipeline = [
            {"$match": {"payment_date": {"$gte": start_date, "$lt": end_date}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        res = self.aggregate(pipeline)
        if res and len(res) > 0 and "total" in res[0]:
            return float(str(res[0]["total"]))
        return 0.0


payments_repo = PaymentsRepository()
