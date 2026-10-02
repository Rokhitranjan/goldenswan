"""
Customers Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id


class CustomersRepository(BaseRepository):
    def __init__(self):
        super().__init__("customers")

    def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        if not phone:
            return None
        return self.find_one({"phone": phone.strip()})

    def create_customer(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        data["name"] = data["name"].strip()
        data["phone"] = data.get("phone", "").strip()
        data["email"] = data.get("email", "").strip().lower()
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)
        return self.insert_one(data)

    def search_customers(self, query_str: str, limit: int = 50) -> List[Dict[str, Any]]:
        if not query_str:
            return self.find({}, sort=[("created_at", -1)], limit=limit)
        regex_pattern = {"$regex": query_str.strip(), "$options": "i"}
        q = {
            "$or": [
                {"name": regex_pattern},
                {"phone": regex_pattern},
                {"email": regex_pattern},
                {"id_proof_number": regex_pattern},
            ]
        }
        return self.find(q, sort=[("name", 1)], limit=limit)


customers_repo = CustomersRepository()
