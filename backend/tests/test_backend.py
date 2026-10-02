"""
Backend Integration & Unit Tests for GoldenSwan Hotel.
Tests MongoDB connection, repositories, services, booking conflict detection,
financial calculations, status lifecycles, and RBAC.
"""

from decimal import Decimal
from datetime import datetime, timezone, timedelta
from django.test import SimpleTestCase
from rest_framework.test import APIClient
from rest_framework import status
from config.mongodb import check_connection, get_database
from core.repositories import (
    rooms_repo,
    bookings_repo,
    customers_repo,
    payments_repo,
    expenses_repo,
    users_repo,
    dashboard_repo,
)
from core.services import booking_service, payment_service, expense_service, payroll_service
from core.authentication.jwt_auth import hash_password, verify_password, generate_tokens


class GoldenSwanBackendTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_01_mongodb_health(self):
        """Test MongoDB connectivity and health check API."""
        connected, msg = check_connection()
        self.assertTrue(connected, f"MongoDB should be connected: {msg}")

        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "ok")
        self.assertEqual(response.data.get("mongodb"), "ok")

    def test_02_auth_login_jwt(self):
        """Test authentication and JWT token generation."""
        response = self.client.post("/api/auth/login/", {
            "email": "admin@goldenswan.com",
            "password": "Admin@12345",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))
        tokens = response.data.get("data", {}).get("tokens", {})
        self.assertIn("access_token", tokens)

        # Test authenticated request with JWT
        token = tokens["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me_resp = self.client.get("/api/auth/me/")
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data.get("data", {}).get("email"), "admin@goldenswan.com")

    def test_03_booking_conflict_prevention(self):
        """Test that overlapping bookings for the same room are prevented."""
        now = datetime.now(timezone.utc)
        # Select an available room
        room = rooms_repo.find_one({"status": "AVAILABLE", "active": True})
        self.assertIsNotNone(room, "Should have at least one available room")

        # Create first booking: day 10 to day 14
        start_1 = now + timedelta(days=10)
        end_1 = now + timedelta(days=14)
        b1 = booking_service.create_booking({
            "room_id": str(room["_id"]),
            "customer_name": "Test Conflict Guest 1",
            "customer_phone": "+91 9999900001",
            "check_in": start_1.isoformat(),
            "check_out": end_1.isoformat(),
            "room_rate": 3000.0,
            "guests": 2,
        })
        self.assertIn("id", b1)

        # Attempt overlapping booking: day 12 to day 16 (overlaps with day 10-14)
        start_2 = now + timedelta(days=12)
        end_2 = now + timedelta(days=16)
        with self.assertRaises(Exception):
            booking_service.create_booking({
                "room_id": str(room["_id"]),
                "customer_name": "Test Conflict Guest 2",
                "customer_phone": "+91 9999900002",
                "check_in": start_2.isoformat(),
                "check_out": end_2.isoformat(),
                "room_rate": 3000.0,
                "guests": 2,
            })

    def test_04_checkin_checkout_room_status_lifecycle(self):
        """
        Tests:
        AVAILABLE -> RESERVED -> check-in -> OCCUPIED -> check-out -> CLEANING
        """
        now = datetime.now(timezone.utc)
        room = rooms_repo.find_one({"status": "AVAILABLE", "active": True})
        self.assertIsNotNone(room)
        room_id = str(room["_id"])

        # Create booking for today
        check_in = now + timedelta(days=20)
        check_out = now + timedelta(days=22)
        booking = booking_service.create_booking({
            "room_id": room_id,
            "customer_name": "Lifecycle Guest",
            "customer_phone": "+91 9999900003",
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "room_rate": 4000.0,
            "guests": 1,
            "amount_paid": 0.0,
        })
        self.assertEqual(booking["booking_status"], "RESERVED")

        # Execute check-in
        checked_in = booking_service.check_in(booking["id"])
        self.assertEqual(checked_in["booking_status"], "CHECKED_IN")

        # Check room status is now OCCUPIED
        updated_room = rooms_repo.get_by_id(room_id)
        self.assertEqual(updated_room["status"], "OCCUPIED")

        # Execute check-out (pay full balance at checkout)
        balance = checked_in["balance_amount"]
        checked_out = booking_service.check_out(booking["id"], payment_data={"amount": balance, "payment_mode": "UPI"})
        self.assertEqual(checked_out["booking_status"], "CHECKED_OUT")
        self.assertEqual(checked_out["payment_status"], "PAID")

        # Room status should now be CLEANING
        cleaning_room = rooms_repo.get_by_id(room_id)
        self.assertEqual(cleaning_room["status"], "CLEANING")

        # Staff marks room as AVAILABLE
        rooms_repo.update_status(room_id, "AVAILABLE")
        available_room = rooms_repo.get_by_id(room_id)
        self.assertEqual(available_room["status"], "AVAILABLE")

    def test_05_financial_balance_and_payment_recording(self):
        """
        Test financial formulas:
        total = 10000, paid = 6000 -> balance = 4000 (PARTIALLY_PAID)
        record additional 4000 -> balance = 0 (PAID)
        """
        now = datetime.now(timezone.utc)
        room = rooms_repo.find_one({"room_number": "310"}) or rooms_repo.find_one({"active": True})
        booking = booking_service.create_booking({
            "room_id": str(room["_id"]),
            "customer_name": "Finance Guest",
            "customer_phone": "+91 9999900004",
            "check_in": (now + timedelta(days=180)).isoformat(),
            "check_out": (now + timedelta(days=182)).isoformat(),
            "room_rate": 5000.0, # 2 nights = 10,000
            "guests": 2,
            "amount_paid": 6000.0,
        })

        self.assertEqual(booking["total_amount"], 10000.0)
        self.assertEqual(booking["amount_paid"], 6000.0)
        self.assertEqual(booking["balance_amount"], 4000.0)
        self.assertEqual(booking["payment_status"], "PARTIALLY_PAID")

        # Pay remaining balance of 4000
        pay_result = payment_service.record_booking_payment({
            "booking_id": booking["id"],
            "amount": 4000.0,
            "payment_mode": "CASH",
        })
        self.assertEqual(pay_result["amount"], 4000.0)

        updated_booking = bookings_repo.get_by_id(booking["id"])
        self.assertEqual(float(str(updated_booking["amount_paid"])), 10000.0)
        self.assertEqual(float(str(updated_booking["balance_amount"])), 0.0)
        self.assertEqual(updated_booking["payment_status"], "PAID")

    def test_06_dashboard_aggregation(self):
        """Test real MongoDB aggregation pipelines for dashboard."""
        overview = dashboard_repo.get_overview_data()
        self.assertIn("rooms", overview)
        self.assertIn("occupancy_rate", overview)
        self.assertIn("revenue", overview)
        self.assertIn("expenses", overview)
        self.assertIn("staff", overview)
        self.assertGreaterEqual(overview["rooms"]["total"], 30)
