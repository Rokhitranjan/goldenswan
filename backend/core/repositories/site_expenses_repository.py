"""
Site Expenses Repository for GoldenSwan Hotel.
Handles project/site-specific vendor contracts and capital/maintenance expenses.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id, to_decimal128


class SiteExpensesRepository(BaseRepository):
    def __init__(self):
        super().__init__("site_expenses")

    def generate_expense_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = self.count({}) + 1
        return f"SITE-EXP-{year}-{count:06d}"

    def create_site_expense(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        if not data.get("expense_id"):
            data["expense_id"] = self.generate_expense_id()

        data["vendor_id"] = to_object_id(data.get("vendor_id"))
        data["date"] = data.get("date", now)
        data["total_amount"] = to_decimal128(data.get("total_amount", 0))
        data["amount_paid"] = to_decimal128(data.get("amount_paid", 0))
        data["balance"] = to_decimal128(data.get("balance", 0))
        data["payment_status"] = data.get("payment_status", "UNPAID")
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)

        return self.insert_one(data)

    def list_site_expenses(
        self,
        vendor_id: Optional[str] = None,
        payment_status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if vendor_id:
            vid = to_object_id(vendor_id)
            if vid:
                query["vendor_id"] = vid
        if payment_status:
            query["payment_status"] = payment_status.upper()
        if date_from or date_to:
            date_filter: Dict[str, Any] = {}
            if date_from:
                date_filter["$gte"] = date_from
            if date_to:
                date_filter["$lte"] = date_to
            query["date"] = date_filter

        return self.find(query, sort=[("date", -1)], limit=limit)

    def get_stats(self) -> Dict[str, float]:
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_amount": {"$sum": "$total_amount"},
                    "amount_paid": {"$sum": "$amount_paid"},
                    "balance": {"$sum": "$balance"},
                }
            }
        ]
        res = self.aggregate(pipeline)
        if res and len(res) > 0:
            return {
                "total_amount": float(str(res[0]["total_amount"])),
                "amount_paid": float(str(res[0]["amount_paid"])),
                "balance": float(str(res[0]["balance"])),
            }
        return {"total_amount": 0.0, "amount_paid": 0.0, "balance": 0.0}


site_expenses_repo = SiteExpensesRepository()
