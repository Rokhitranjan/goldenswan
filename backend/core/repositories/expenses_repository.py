"""
Daily Expenses Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id, to_decimal128


class ExpensesRepository(BaseRepository):
    def __init__(self):
        super().__init__("expenses")

    def generate_expense_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = self.count({}) + 1
        return f"EXP-{year}-{count:06d}"

    def create_expense(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        if not data.get("expense_id"):
            data["expense_id"] = self.generate_expense_id()

        data["category_id"] = to_object_id(data.get("category_id"))
        data["date"] = data.get("date", now)
        data["total_amount"] = to_decimal128(data.get("total_amount", 0))
        data["amount_paid"] = to_decimal128(data.get("amount_paid", 0))
        data["balance"] = to_decimal128(data.get("balance", 0))
        data["payment_status"] = data.get("payment_status", "UNPAID")
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)

        return self.insert_one(data)

    def list_expenses(
        self,
        category_id: Optional[str] = None,
        payment_status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if category_id:
            oid = to_object_id(category_id)
            if oid:
                query["category_id"] = oid
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

    def get_total_expense_range(self, start_date: datetime, end_date: datetime) -> float:
        pipeline = [
            {"$match": {"date": {"$gte": start_date, "$lt": end_date}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
        ]
        res = self.aggregate(pipeline)
        if res and len(res) > 0 and "total" in res[0]:
            return float(str(res[0]["total"]))
        return 0.0

    def get_category_breakdown(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        match_stage = {}
        if start_date and end_date:
            match_stage = {"date": {"$gte": start_date, "$lt": end_date}}

        pipeline = []
        if match_stage:
            pipeline.append({"$match": match_stage})

        pipeline.extend([
            {
                "$group": {
                    "_id": "$category_name",
                    "total_amount": {"$sum": "$total_amount"},
                    "amount_paid": {"$sum": "$amount_paid"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"total_amount": -1}},
        ])
        results = self.aggregate(pipeline)
        formatted = []
        for r in results:
            formatted.append({
                "category": r["_id"] or "Uncategorized",
                "total_amount": float(str(r["total_amount"])),
                "amount_paid": float(str(r["amount_paid"])),
                "count": r["count"],
            })
        return formatted


expenses_repo = ExpensesRepository()
