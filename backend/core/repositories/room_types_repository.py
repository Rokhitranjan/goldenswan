"""
Room Types Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_decimal128


class RoomTypesRepository(BaseRepository):
    def __init__(self):
        super().__init__("room_types")

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"name": name.strip()})

    def create_room_type(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        data["name"] = data["name"].strip()
        data["base_price"] = to_decimal128(data.get("base_price", 0))
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)
        data["active"] = data.get("active", True)
        return self.insert_one(data)

    def list_active(self) -> List[Dict[str, Any]]:
        return self.find({"active": True}, sort=[("name", 1)])


room_types_repo = RoomTypesRepository()
