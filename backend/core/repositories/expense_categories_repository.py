"""
Expense Categories Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository


class ExpenseCategoriesRepository(BaseRepository):
    def __init__(self):
        super().__init__("expense_categories")

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"name": name.strip()})

    def create_category(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        data["name"] = data["name"].strip()
        data["created_at"] = data.get("created_at", now)
        data["active"] = data.get("active", True)
        return self.insert_one(data)

    def list_active(self) -> List[Dict[str, Any]]:
        return self.find({"active": True}, sort=[("name", 1)])


expense_categories_repo = ExpenseCategoriesRepository()
