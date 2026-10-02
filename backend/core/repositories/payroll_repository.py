"""
Payroll Repository for GoldenSwan Hotel.
Handles monthly salary calculations, staff payroll records, and payment status.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_decimal128


class PayrollRepository(BaseRepository):
    def __init__(self):
        super().__init__("payroll")

    def create_or_update_payroll(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        staff_id = str(data["staff_id"]).strip()
        month = int(data["month"])
        year = int(data["year"])

        # Decimal conversions for safe monetary values
        data["base_salary"] = to_decimal128(data.get("base_salary", 0))
        data["overtime_amount"] = to_decimal128(data.get("overtime_amount", 0))
        data["deduction"] = to_decimal128(data.get("deduction", 0))
        data["bonus"] = to_decimal128(data.get("bonus", 0))
        data["other_adjustment"] = to_decimal128(data.get("other_adjustment", 0))
        data["final_payable_salary"] = to_decimal128(data.get("final_payable_salary", 0))

        existing = self.find_one({"staff_id": staff_id, "year": year, "month": month})
        if existing:
            data["updated_at"] = now
            self.update_one({"_id": existing["_id"]}, data)
            return existing["_id"]

        data["staff_id"] = staff_id
        data["year"] = year
        data["month"] = month
        data["payment_status"] = data.get("payment_status", "PENDING")
        data["created_at"] = now
        data["updated_at"] = now
        return self.insert_one(data)

    def list_payroll(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if year:
            query["year"] = int(year)
        if month:
            query["month"] = int(month)
        return self.find(query, sort=[("year", -1), ("month", -1), ("staff_name", 1)])


payroll_repo = PayrollRepository()
