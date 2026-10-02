"""
Notifications Repository for GoldenSwan Hotel.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id


class NotificationsRepository(BaseRepository):
    def __init__(self):
        super().__init__("notifications")

    def create_notification(
        self,
        title: str,
        message: str,
        notif_type: str = "INFO",
        link: Optional[str] = None,
    ) -> ObjectId:
        now = datetime.now(timezone.utc)
        data = {
            "title": title,
            "message": message,
            "type": notif_type.upper(),
            "link": link or "",
            "is_read": False,
            "created_at": now,
        }
        return self.insert_one(data)

    def list_notifications(self, unread_only: bool = False, limit: int = 50) -> List[Dict[str, Any]]:
        query = {"is_read": False} if unread_only else {}
        return self.find(query, sort=[("created_at", -1)], limit=limit)

    def mark_all_as_read(self) -> int:
        res = self.collection.update_many({"is_read": False}, {"$set": {"is_read": True}})
        return res.modified_count

    def mark_as_read(self, notif_id: str) -> bool:
        oid = to_object_id(notif_id)
        if not oid:
            return False
        return self.update_one({"_id": oid}, {"is_read": True})


notifications_repo = NotificationsRepository()
