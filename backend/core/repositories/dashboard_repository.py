"""
Dashboard Repository for GoldenSwan Hotel.
Uses MongoDB aggregation pipelines to calculate real-time KPI metrics, revenue/expense trends,
room occupancy, and attendance statistics.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from core.database import get_database


class DashboardRepository:
    def get_overview_data(self) -> Dict[str, Any]:
        db = get_database()
        now = datetime.now(timezone.utc)

        # Time ranges
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        today_end = today_start + timedelta(days=1)

        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=timezone.utc)

        # 1. Rooms aggregation
        room_pipeline = [
            {"$match": {"active": True}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        room_agg = list(db["rooms"].aggregate(room_pipeline))
        rooms_dict = {
            "total": 0,
            "occupied": 0,
            "available": 0,
            "reserved": 0,
            "cleaning": 0,
            "maintenance": 0,
        }
        total_rooms = 0
        for item in room_agg:
            st = str(item["_id"]).lower()
            cnt = item["count"]
            if st in rooms_dict:
                rooms_dict[st] = cnt
            total_rooms += cnt
        rooms_dict["total"] = total_rooms

        # 2. Bookings checkins/checkouts today
        today_checkins = db["bookings"].count_documents({
            "check_in": {"$gte": today_start, "$lt": today_end},
            "booking_status": {"$in": ["RESERVED", "CHECKED_IN"]},
        })
        today_checkouts = db["bookings"].count_documents({
            "check_out": {"$gte": today_start, "$lt": today_end},
            "booking_status": "CHECKED_IN",
        })

        # 3. Revenue aggregations (from payments collection)
        def aggregate_revenue(start_dt, end_dt=None):
            match = {"payment_date": {"$gte": start_dt}}
            if end_dt:
                match["payment_date"]["$lt"] = end_dt
            pipe = [
                {"$match": match},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ]
            res = list(db["payments"].aggregate(pipe))
            return float(str(res[0]["total"])) if res and "total" in res[0] else 0.0

        rev_today = aggregate_revenue(today_start, today_end)
        rev_week = aggregate_revenue(week_start)
        rev_month = aggregate_revenue(month_start)

        # 4. Expense aggregations (from expenses collection)
        def aggregate_expenses(start_dt, end_dt=None):
            match = {"date": {"$gte": start_dt}}
            if end_dt:
                match["date"]["$lt"] = end_dt
            pipe = [
                {"$match": match},
                {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
            ]
            res = list(db["expenses"].aggregate(pipe))
            return float(str(res[0]["total"])) if res and "total" in res[0] else 0.0

        exp_today = aggregate_expenses(today_start, today_end)
        exp_week = aggregate_expenses(week_start)
        exp_month = aggregate_expenses(month_start)

        # Pending expenses balance
        pending_exp_pipe = [
            {"$match": {"payment_status": {"$in": ["UNPAID", "PARTIALLY_PAID"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$balance"}}},
        ]
        pending_exp_res = list(db["expenses"].aggregate(pending_exp_pipe))
        pending_expenses = float(str(pending_exp_res[0]["total"])) if pending_exp_res and "total" in pending_exp_res[0] else 0.0

        # Pending receivables (from bookings)
        pending_rec_pipe = [
            {"$match": {"payment_status": {"$in": ["PENDING", "PARTIALLY_PAID"]}, "booking_status": {"$in": ["RESERVED", "CHECKED_IN"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$balance_amount"}}},
        ]
        pending_rec_res = list(db["bookings"].aggregate(pending_rec_pipe))
        pending_receivables = float(str(pending_rec_res[0]["total"])) if pending_rec_res and "total" in pending_rec_res[0] else 0.0

        # 5. Staff attendance stats
        today_date_str = today_start.strftime("%Y-%m-%d")
        att_pipe = [
            {"$match": {"date": today_date_str}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        att_agg = list(db["attendance"].aggregate(att_pipe))
        staff_stats = {"total": 0, "present": 0, "absent": 0, "leave": 0}
        total_recorded = 0
        for item in att_agg:
            st = str(item["_id"]).lower()
            cnt = item["count"]
            if st in staff_stats:
                staff_stats[st] = cnt
            total_recorded += cnt
        total_active_staff = db["staff"].count_documents({"employment_status": "ACTIVE"})
        staff_stats["total"] = total_active_staff or total_recorded

        # Site expenses total
        site_exp_pipe = [
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "paid": {"$sum": "$amount_paid"}, "pending": {"$sum": "$balance"}}}
        ]
        site_exp_res = list(db["site_expenses"].aggregate(site_exp_pipe))
        site_exp_data = {
            "total": float(str(site_exp_res[0]["total"])) if site_exp_res else 0.0,
            "paid": float(str(site_exp_res[0]["paid"])) if site_exp_res else 0.0,
            "pending": float(str(site_exp_res[0]["pending"])) if site_exp_res else 0.0,
        }

        # Calculate occupancy percentage
        occupancy_rate = 0.0
        if rooms_dict["total"] > 0:
            occupancy_rate = round((rooms_dict["occupied"] / rooms_dict["total"]) * 100, 1)

        return {
            "rooms": rooms_dict,
            "occupancy_rate": occupancy_rate,
            "bookings": {
                "today_checkins": today_checkins,
                "today_checkouts": today_checkouts,
            },
            "revenue": {
                "today": round(rev_today, 2),
                "this_week": round(rev_week, 2),
                "this_month": round(rev_month, 2),
                "pending_receivables": round(pending_rec_pipe_amount := pending_receivables, 2),
            },
            "expenses": {
                "today": round(exp_today, 2),
                "this_week": round(exp_week, 2),
                "this_month": round(exp_month, 2),
                "pending": round(pending_expenses, 2),
            },
            "site_expenses": site_exp_data,
            "staff": staff_stats,
        }

    def get_revenue_trend(self, days: int = 14) -> List[Dict[str, Any]]:
        db = get_database()
        now = datetime.now(timezone.utc)
        results = []

        for i in range(days - 1, -1, -1):
            day_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc) - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            date_label = day_start.strftime("%b %d")

            rev_pipe = [
                {"$match": {"payment_date": {"$gte": day_start, "$lt": day_end}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ]
            rev_res = list(db["payments"].aggregate(rev_pipe))
            rev_amount = float(str(rev_res[0]["total"])) if rev_res and "total" in rev_res[0] else 0.0

            exp_pipe = [
                {"$match": {"date": {"$gte": day_start, "$lt": day_end}}},
                {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
            ]
            exp_res = list(db["expenses"].aggregate(exp_pipe))
            exp_amount = float(str(exp_res[0]["total"])) if exp_res and "total" in exp_res[0] else 0.0

            results.append({
                "date": date_label,
                "full_date": day_start.strftime("%Y-%m-%d"),
                "revenue": round(rev_amount, 2),
                "expenses": round(exp_amount, 2),
            })

        return results


dashboard_repo = DashboardRepository()
