"""
Vendors Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository


class VendorsRepository(BaseRepository):
    def __init__(self):
        super().__init__("vendors")

    def create_vendor(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        data["name"] = data["name"].strip()
        data["phone"] = data.get("phone", "").strip()
        data["email"] = data.get("email", "").strip().lower()
        data["active"] = data.get("active", True)
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)
        return self.insert_one(data)

    def list_vendors(self, active_only: bool = True) -> List[Dict[str, Any]]:
        query = {"active": True} if active_only else {}
        return self.find(query, sort=[("name", 1)])


vendors_repo = VendorsRepository()
