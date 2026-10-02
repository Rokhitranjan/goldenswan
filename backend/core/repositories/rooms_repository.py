"""
Rooms Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id, to_decimal128


class RoomsRepository(BaseRepository):
    def __init__(self):
        super().__init__("rooms")

    def get_by_room_number(self, room_number: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"room_number": str(room_number).strip()})

    def create_room(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        data["room_number"] = str(data["room_number"]).strip()
        data["price"] = to_decimal128(data.get("price", 0))
        data["floor"] = int(data.get("floor", 1))
        data["capacity"] = int(data.get("capacity", 2))
        data["status"] = data.get("status", "AVAILABLE")
        data["active"] = data.get("active", True)
        data["amenities"] = data.get("amenities", [])
        data["created_at"] = data.get("created_at", now)
        data["updated_at"] = data.get("updated_at", now)
        if "room_type_id" in data and data["room_type_id"]:
            data["room_type_id"] = to_object_id(data["room_type_id"])
        return self.insert_one(data)

    def list_rooms(
        self,
        status: Optional[str] = None,
        floor: Optional[int] = None,
        room_type_id: Optional[str] = None,
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if active_only:
            query["active"] = True
        if status:
            query["status"] = status.upper()
        if floor is not None:
            query["floor"] = int(floor)
        if room_type_id:
            oid = to_object_id(room_type_id)
            if oid:
                query["room_type_id"] = oid
        return self.find(query, sort=[("room_number", 1)])

    def update_status(self, room_id: Union[str, ObjectId], new_status: str) -> bool:
        oid = to_object_id(room_id)
        if not oid:
            return False
        return self.update_one(
            {"_id": oid},
            {
                "status": new_status.upper(),
                "updated_at": datetime.now(timezone.utc),
            },
        )

    def get_counts_by_status(self) -> Dict[str, int]:
        pipeline = [
            {"$match": {"active": True}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        results = self.aggregate(pipeline)
        counts = {
            "AVAILABLE": 0,
            "RESERVED": 0,
            "OCCUPIED": 0,
            "CLEANING": 0,
            "MAINTENANCE": 0,
            "total": 0,
        }
        total = 0
        for item in results:
            st = item["_id"]
            cnt = item["count"]
            if st in counts:
                counts[st] = cnt
            total += cnt
        counts["total"] = total
        return counts


rooms_repo = RoomsRepository()
