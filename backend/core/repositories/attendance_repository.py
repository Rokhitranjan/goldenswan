"""
Attendance Repository for GoldenSwan Hotel.
Handles daily staff clock-in/attendance tracking and monthly attendance summaries.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from core.repositories.base_repository import BaseRepository
from core.serializers.mongodb import to_object_id


class AttendanceRepository(BaseRepository):
    def __init__(self):
        super().__init__("attendance")

    def mark_attendance(self, data: Dict[str, Any]) -> ObjectId:
        now = datetime.now(timezone.utc)
        staff_id = str(data["staff_id"]).strip()
        date_str = str(data["date"]).strip()

        existing = self.find_one({"staff_id": staff_id, "date": date_str})
        if existing:
            self.update_one(
                {"_id": existing["_id"]},
                {
                    "status": data.get("status", "PRESENT").upper(),
                    "check_in_time": data.get("check_in_time"),
                    "check_out_time": data.get("check_out_time"),
                    "remarks": data.get("remarks", ""),
                    "updated_at": now,
                },
            )
            return existing["_id"]

        data["staff_id"] = staff_id
        data["date"] = date_str
        data["status"] = data.get("status", "PRESENT").upper()
        data["created_at"] = now
        data["updated_at"] = now
        return self.insert_one(data)

    def get_today_stats(self, date_str: str) -> Dict[str, int]:
        pipeline = [
            {"$match": {"date": date_str}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        results = self.aggregate(pipeline)
        stats = {"PRESENT": 0, "ABSENT": 0, "LEAVE": 0, "HALF_DAY": 0, "total": 0}
        total = 0
        for item in results:
            st = item["_id"]
            cnt = item["count"]
            if st in stats:
                stats[st] = cnt
            total += cnt
        stats["total"] = total
        return stats

    def get_monthly_staff_attendance(self, staff_id: str, year: int, month: int) -> List[Dict[str, Any]]:
        prefix = f"{year:04d}-{month:02d}"
        regex_pattern = {"$regex": f"^{prefix}"}
        return self.find({"staff_id": staff_id, "date": regex_pattern}, sort=[("date", 1)])


attendance_repo = AttendanceRepository()
