"""
Staff Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_decimal128


class StaffRepository(BaseRepository):
    def __init__(self):
        super().__init__("staff")

    def get_by_staff_id(self, staff_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"staff_id": staff_id.strip()})

    def generate_staff_id(self) -> str:
        count = self.count({}) + 1
        return f"STF-{count:03d}"

    def create_staff(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        if not data.get("staff_id"):
            data["staff_id"] = self.generate_staff_id()

        data["name"] = data["name"].strip()
        data["salary"] = to_decimal128(data.get("salary", 0))
        data["employment_status"] = data.get("employment_status", "ACTIVE")
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)

        return self.insert_one(data)

    def list_staff(
        self,
        department: Optional[str] = None,
        employment_status: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if department:
            query["department"] = department
        if employment_status:
            query["employment_status"] = employment_status.upper()
        if search_query:
            regex_val = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"name": regex_val},
                {"staff_id": regex_val},
                {"phone": regex_val},
                {"department": regex_val},
            ]
        return self.find(query, sort=[("name", 1)])


staff_repo = StaffRepository()
