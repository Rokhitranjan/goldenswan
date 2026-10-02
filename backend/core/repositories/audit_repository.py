"""
Audit Repository for GoldenSwan Hotel.
Tracks system events, changes, check-ins, check-outs, financial transactions, and user logins.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
from core.repositories.base_repository import BaseRepository


class AuditRepository(BaseRepository):
    def __init__(self):
        super().__init__("audit_logs")

    def log_event(
        self,
        action: str,
        module: str,
        user: Optional[Dict[str, Any]] = None,
        record_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> ObjectId:
        now = datetime.now(timezone.utc)
        log_entry = {
            "action": action,
            "module": module,
            "record_id": str(record_id) if record_id else None,
            "user_id": str(user.get("id") or user.get("_id")) if user else "SYSTEM",
            "user_name": user.get("name", "System") if user else "System",
            "user_role": user.get("role", "SYSTEM") if user else "SYSTEM",
            "metadata": metadata or {},
            "ip_address": ip_address,
            "timestamp": now,
        }
        return self.insert_one(log_entry)

    def list_logs(self, module: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        query = {"module": module} if module else {}
        return self.find(query, sort=[("timestamp", -1)], limit=limit)


audit_repo = AuditRepository()
