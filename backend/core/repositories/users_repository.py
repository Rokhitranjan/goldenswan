"""
Users Repository for GoldenSwan Hotel.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id


class UsersRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        return self.find_one({"email": email.strip().lower()})

    def create_user(self, user_data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        user_data["email"] = user_data["email"].strip().lower()
        user_data["created_at"] = user_data.get("created_at", now)
        user_data["updated_at"] = user_data.get("updated_at", now)
        user_data["active"] = user_data.get("active", True)
        if "permissions" not in user_data:
            user_data["permissions"] = []
        return self.insert_one(user_data)

    def list_users(self, active_only: bool = False) -> List[Dict[str, Any]]:
        query = {"active": True} if active_only else {}
        return self.find(query, sort=[("name", 1)])

    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        update_data["updated_at"] = datetime.now(timezone.utc)
        if "email" in update_data:
            update_data["email"] = update_data["email"].strip().lower()
        return self.update_by_id(user_id, update_data)


users_repo = UsersRepository()
