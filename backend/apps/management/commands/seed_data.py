"""
Management command to populate realistic development seed data for GoldenSwan Hotel.
Usage:
    python manage.py seed_data
"""

import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from core.database import get_database, check_connection
from core.repositories import (
    users_repo,
    rooms_repo,
    room_types_repo,
    customers_repo,
    bookings_repo,
    payments_repo,
    expenses_repo,
    expense_categories_repo,
    vendors_repo,
    site_expenses_repo,
    staff_repo,
    attendance_repo,
    payroll_repo,
    notifications_repo,
    audit_repo,
)
from core.authentication.jwt_auth import hash_password
from core.serializers.mongodb import to_decimal128, to_object_id


class Command(BaseCommand):
    help = "Seeds database with realistic hotel data for rooms, customers, bookings, expenses, staff, and users."

    def handle(self, *args, **options):
        connected, msg = check_connection()
        if not connected:
            self.stderr.write(self.style.ERROR(f"Database unavailable: {msg}"))
            sys.exit(1)

        db = get_database()
        self.stdout.write("Seeding development data for GoldenSwan Hotel...")

        now = datetime.now(timezone.utc)

        # 1. Seed Users
        seed_users = [
            {
                "name": "GoldenSwan Admin",
                "email": "admin@goldenswan.com",
                "password": "Admin@12345",
                "role": "SUPER_ADMIN",
                "phone": "+91 9876543210",
                "permissions": ["all"],
            },
            {
                "name": "Vikram Singh (Manager)",
                "email": "manager@goldenswan.com",
                "password": "Manager@12345",
                "role": "MANAGER",
                "phone": "+91 9876543211",
                "permissions": ["rooms", "bookings", "expenses", "staff"],
            },
            {
                "name": "Priya Sharma (Receptionist)",
                "email": "reception@goldenswan.com",
                "password": "Reception@12345",
                "role": "RECEPTIONIST",
                "phone": "+91 9876543212",
                "permissions": ["rooms", "bookings", "check-in", "check-out", "payments"],
            },
            {
                "name": "Ramesh Gupta (Accountant)",
                "email": "accounts@goldenswan.com",
                "password": "Accounts@12345",
                "role": "ACCOUNTANT",
                "phone": "+91 9876543213",
                "permissions": ["expenses", "site_expenses", "payments", "payroll", "reports"],
            },
        ]

        for u in seed_users:
            if not users_repo.get_by_email(u["email"]):
                pw_hash = hash_password(u.pop("password"))
                u["password_hash"] = pw_hash
                users_repo.create_user(u)
                self.stdout.write(f" + Created user: {u['email']} [{u['role']}]")

        # 2. Seed Room Types
        types_map = {}
        for rt in room_types_repo.list_active():
            types_map[rt["name"]] = rt["_id"]

        deluxe_id = types_map.get("Deluxe Room")
        exec_id = types_map.get("Executive Suite")
        single_id = types_map.get("Standard Single")
        pres_id = types_map.get("Presidential Suite")

        # 3. Seed 30 Rooms across 3 floors
        # Floor 1: Standard Singles & Deluxe
        # Floor 2: Deluxe & Executive Suites
        # Floor 3: Executive & Presidential Suites
        rooms_spec = []
        for i in range(1, 11):
            num = f"10{i}" if i < 10 else f"1{i}"
            is_single = i <= 5
            rooms_spec.append({
                "room_number": num,
                "room_type_id": single_id if is_single else deluxe_id,
                "floor": 1,
                "price": 2200.0 if is_single else 3500.0,
                "capacity": 1 if is_single else 2,
                "status": "AVAILABLE",
                "description": "Ground floor comfortable room with garden access.",
                "amenities": ["Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge"] if not is_single else ["Wi-Fi", "Air Conditioning", "Work Desk"],
            })

        for i in range(1, 11):
            num = f"20{i}" if i < 10 else f"2{i}"
            is_exec = i > 6
            rooms_spec.append({
                "room_number": num,
                "room_type_id": exec_id if is_exec else deluxe_id,
                "floor": 2,
                "price": 6500.0 if is_exec else 3800.0,
                "capacity": 3 if is_exec else 2,
                "status": "AVAILABLE",
                "description": "Second floor room with city skyline views.",
                "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Balcony", "Tea/Coffee Maker", "Bathtub"] if is_exec else ["Wi-Fi", "Air Conditioning", "Smart TV"],
            })

        for i in range(1, 11):
            num = f"30{i}" if i < 10 else f"3{i}"
            is_pres = i >= 9
            rooms_spec.append({
                "room_number": num,
                "room_type_id": pres_id if is_pres else exec_id,
                "floor": 3,
                "price": 12500.0 if is_pres else 6800.0,
                "capacity": 4 if is_pres else 3,
                "status": "AVAILABLE",
                "description": "Penthouse level premium accommodation.",
                "amenities": ["Jacuzzi", "King Bed", "Private Terrace", "Complimentary Lounge Access", "Butler Service"] if is_pres else ["High-speed Wi-Fi", "Balcony", "Living Area"],
            })

        for r in rooms_spec:
            if not rooms_repo.get_by_room_number(r["room_number"]):
                rooms_repo.create_room(r)

        self.stdout.write(f" - Ensured 30 hotel rooms created across floors 1, 2, and 3.")

        # 4. Seed Customers
        seed_customers = [
            {"name": "Ananya Roy", "phone": "+91 9988776655", "email": "ananya.roy@example.com", "address": "Kolkata, WB", "id_proof_type": "Aadhaar", "id_proof_number": "1234-5678-9012"},
            {"name": "Rahul Verma", "phone": "+91 9811223344", "email": "rahul.verma@example.com", "address": "Delhi, DL", "id_proof_type": "Passport", "id_proof_number": "Z8976543"},
            {"name": "Sneha Patel", "phone": "+91 9723456789", "email": "sneha.patel@example.com", "address": "Ahmedabad, GJ", "id_proof_type": "Driving License", "id_proof_number": "GJ-01-2019-0034"},
            {"name": "Amitabh Sen", "phone": "+91 9433012345", "email": "amitabh.sen@example.com", "address": "Mumbai, MH", "id_proof_type": "Aadhaar", "id_proof_number": "9876-5432-1098"},
            {"name": "Deepa Sundaram", "phone": "+91 9840123456", "email": "deepa.s@example.com", "address": "Chennai, TN", "id_proof_type": "Aadhaar", "id_proof_number": "4567-8901-2345"},
        ]
        created_customers = []
        for c in seed_customers:
            existing = customers_repo.get_by_phone(c["phone"])
            if not existing:
                cid = customers_repo.create_customer(c)
                created_customers.append(customers_repo.get_by_id(cid))
            else:
                created_customers.append(existing)

        # 5. Seed Bookings and Payments
        all_rooms = rooms_repo.list_rooms()
        r101 = next((r for r in all_rooms if r["room_number"] == "101"), all_rooms[0])
        r102 = next((r for r in all_rooms if r["room_number"] == "102"), all_rooms[1])
        r201 = next((r for r in all_rooms if r["room_number"] == "201"), all_rooms[10])
        r202 = next((r for r in all_rooms if r["room_number"] == "202"), all_rooms[11])
        r301 = next((r for r in all_rooms if r["room_number"] == "301"), all_rooms[20])
        r309 = next((r for r in all_rooms if r["room_number"] == "309"), all_rooms[28])

        # Active checked-in booking 1: Room 101 (Occupied)
        if bookings_repo.count({"room_id": r101["_id"], "booking_status": "CHECKED_IN"}) == 0:
            b1_in = now - timedelta(days=1)
            b1_out = now + timedelta(days=2)
            b1_total = Decimal("6600.00")
            b1_paid = Decimal("6600.00")
            b1_id = bookings_repo.create_booking({
                "booking_id": "GS-2026-000001",
                "customer_id": created_customers[0]["_id"],
                "customer_name": created_customers[0]["name"],
                "customer_phone": created_customers[0]["phone"],
                "room_id": r101["_id"],
                "room_number": r101["room_number"],
                "check_in": b1_in,
                "check_out": b1_out,
                "nights": 3,
                "guests": 1,
                "room_rate": to_decimal128(2200.0),
                "total_amount": to_decimal128(b1_total),
                "amount_paid": to_decimal128(b1_paid),
                "balance_amount": to_decimal128(Decimal("0.00")),
                "booking_status": "CHECKED_IN",
                "payment_status": "PAID",
            })
            payments_repo.create_payment({
                "booking_id": b1_id,
                "booking_code": "GS-2026-000001",
                "customer_id": created_customers[0]["_id"],
                "customer_name": created_customers[0]["name"],
                "amount": to_decimal128(b1_paid),
                "payment_mode": "UPI",
                "reference_number": "UPI/2026/890123",
                "payment_date": b1_in,
                "received_by": "Priya Sharma",
            })
            rooms_repo.update_status(r101["_id"], "OCCUPIED")

        # Active checked-in booking 2: Room 201 (Occupied with partial payment)
        if bookings_repo.count({"room_id": r201["_id"], "booking_status": "CHECKED_IN"}) == 0:
            b2_in = now - timedelta(hours=6)
            b2_out = now + timedelta(days=3)
            b2_total = Decimal("11400.00")
            b2_paid = Decimal("5000.00")
            b2_id = bookings_repo.create_booking({
                "booking_id": "GS-2026-000002",
                "customer_id": created_customers[1]["_id"],
                "customer_name": created_customers[1]["name"],
                "customer_phone": created_customers[1]["phone"],
                "room_id": r201["_id"],
                "room_number": r201["room_number"],
                "check_in": b2_in,
                "check_out": b2_out,
                "nights": 3,
                "guests": 2,
                "room_rate": to_decimal128(3800.0),
                "total_amount": to_decimal128(b2_total),
                "amount_paid": to_decimal128(b2_paid),
                "balance_amount": to_decimal128(b2_total - b2_paid),
                "booking_status": "CHECKED_IN",
                "payment_status": "PARTIALLY_PAID",
            })
            payments_repo.create_payment({
                "booking_id": b2_id,
                "booking_code": "GS-2026-000002",
                "customer_id": created_customers[1]["_id"],
                "customer_name": created_customers[1]["name"],
                "amount": to_decimal128(b2_paid),
                "payment_mode": "CREDIT_CARD",
                "reference_number": "TXN_CC_99881",
                "payment_date": b2_in,
                "received_by": "Priya Sharma",
            })
            rooms_repo.update_status(r201["_id"], "OCCUPIED")

        # Reserved booking: Room 202
        if bookings_repo.count({"room_id": r202["_id"], "booking_status": "RESERVED"}) == 0:
            b3_in = now + timedelta(days=1)
            b3_out = now + timedelta(days=4)
            b3_total = Decimal("19500.00")
            b3_paid = Decimal("5000.00")
            bookings_repo.create_booking({
                "booking_id": "GS-2026-000003",
                "customer_id": created_customers[2]["_id"],
                "customer_name": created_customers[2]["name"],
                "customer_phone": created_customers[2]["phone"],
                "room_id": r202["_id"],
                "room_number": r202["room_number"],
                "check_in": b3_in,
                "check_out": b3_out,
                "nights": 3,
                "guests": 2,
                "room_rate": to_decimal128(6500.0),
                "total_amount": to_decimal128(b3_total),
                "amount_paid": to_decimal128(b3_paid),
                "balance_amount": to_decimal128(b3_total - b3_paid),
                "booking_status": "RESERVED",
                "payment_status": "PARTIALLY_PAID",
            })
            rooms_repo.update_status(r202["_id"], "RESERVED")

        # Cleaning room: Room 102
        rooms_repo.update_status(r102["_id"], "CLEANING")

        # Maintenance room: Room 301
        rooms_repo.update_status(r301["_id"], "MAINTENANCE")

        # 6. Seed Daily Expenses
        exp_cats = expense_categories_repo.list_active()
        cat_maint = next((c for c in exp_cats if "Maintenance" in c["name"]), exp_cats[0])
        cat_groc = next((c for c in exp_cats if "Grocery" in c["name"]), exp_cats[1])
        cat_comm = next((c for c in exp_cats if "Common" in c["name"]), exp_cats[2])

        if expenses_repo.count({}) < 3:
            expenses_repo.create_expense({
                "expense_id": "EXP-2026-000001",
                "category_id": cat_groc["_id"],
                "category_name": cat_groc["name"],
                "description": "Vegetables, dairy, and breakfast bakery items for restaurant",
                "date": now - timedelta(hours=4),
                "total_amount": to_decimal128(4850.0),
                "amount_paid": to_decimal128(4850.0),
                "balance": to_decimal128(0.0),
                "payment_status": "PAID",
                "payment_mode": "UPI",
                "created_by": "Ramesh Gupta",
            })
            expenses_repo.create_expense({
                "expense_id": "EXP-2026-000002",
                "category_id": cat_maint["_id"],
                "category_name": cat_maint["name"],
                "description": "AC filter replacement and refrigerant recharge in 3rd floor suites",
                "date": now - timedelta(days=1),
                "total_amount": to_decimal128(3200.0),
                "amount_paid": to_decimal128(2000.0),
                "balance": to_decimal128(1200.0),
                "payment_status": "PARTIALLY_PAID",
                "payment_mode": "CASH",
                "created_by": "Ramesh Gupta",
            })
            expenses_repo.create_expense({
                "expense_id": "EXP-2026-000003",
                "category_id": cat_comm["_id"],
                "category_name": cat_comm["name"],
                "description": "High speed fiber commercial internet monthly lease",
                "date": now - timedelta(days=2),
                "total_amount": to_decimal128(7500.0),
                "amount_paid": to_decimal128(7500.0),
                "balance": to_decimal128(0.0),
                "payment_status": "PAID",
                "payment_mode": "NET_BANKING",
                "created_by": "Ramesh Gupta",
            })

        # 7. Seed Vendors & Site Expenses
        v1_id = None
        if vendors_repo.count({}) == 0:
            v1_id = vendors_repo.create_vendor({
                "name": "Apex Engineering & Elevators",
                "contact_person": "Rajesh Nair",
                "phone": "+91 9820011223",
                "email": "service@apexelevators.in",
                "address": "MIDC Industrial Estate, Mumbai",
                "gst_number": "27AAACA1234B1Z5",
            })
            vendors_repo.create_vendor({
                "name": "Swan Linen & Laundry Supplies",
                "contact_person": "Sunita Rao",
                "phone": "+91 9845012345",
                "email": "orders@swanlinen.com",
                "address": "Bangalore Textile Park",
                "gst_number": "29AAACS5678C1Z2",
            })

        if site_expenses_repo.count({}) == 0 and v1_id:
            site_expenses_repo.create_site_expense({
                "expense_id": "SITE-EXP-2026-000001",
                "category": "Capital Maintenance",
                "vendor_id": v1_id,
                "vendor_name": "Apex Engineering & Elevators",
                "description": "Quarterly comprehensive elevator lift overhaul and motor safety test",
                "date": now - timedelta(days=3),
                "total_amount": to_decimal128(45000.0),
                "amount_paid": to_decimal128(30000.0),
                "balance": to_decimal128(15000.0),
                "payment_status": "PARTIALLY_PAID",
                "payment_mode": "CHEQUE",
                "created_by": "Ramesh Gupta",
            })

        # 8. Seed Staff
        seed_staff = [
            {"staff_id": "STF-001", "name": "Priya Sharma", "phone": "+91 9876543212", "email": "priya.sharma@goldenswan.com", "position": "Head Receptionist", "department": "Front Desk", "salary": 32000.0},
            {"staff_id": "STF-002", "name": "Mohan Lal", "phone": "+91 9822334455", "email": "mohan.lal@goldenswan.com", "position": "Housekeeping Supervisor", "department": "Housekeeping", "salary": 24000.0},
            {"staff_id": "STF-003", "name": "Chef Sanjeev Roy", "phone": "+91 9833445566", "email": "sanjeev.roy@goldenswan.com", "position": "Head Chef", "department": "Kitchen", "salary": 45000.0},
            {"staff_id": "STF-004", "name": "Kavita Nair", "phone": "+91 9844556677", "email": "kavita.nair@goldenswan.com", "position": "Guest Relations Associate", "department": "Front Desk", "salary": 28000.0},
            {"staff_id": "STF-005", "name": "Arun Kumar", "phone": "+91 9855667788", "email": "arun.kumar@goldenswan.com", "position": "Facility & Electrical Tech", "department": "Maintenance", "salary": 26000.0},
        ]
        for st in seed_staff:
            if not staff_repo.get_by_staff_id(st["staff_id"]):
                staff_repo.create_staff(st)

        # 9. Seed Attendance for Today
        today_str = now.strftime("%Y-%m-%d")
        attendance_repo.mark_attendance({"staff_id": "STF-001", "date": today_str, "status": "PRESENT", "check_in_time": "08:55 AM"})
        attendance_repo.mark_attendance({"staff_id": "STF-002", "date": today_str, "status": "PRESENT", "check_in_time": "08:45 AM"})
        attendance_repo.mark_attendance({"staff_id": "STF-003", "date": today_str, "status": "PRESENT", "check_in_time": "07:30 AM"})
        attendance_repo.mark_attendance({"staff_id": "STF-004", "date": today_str, "status": "LEAVE", "remarks": "Approved casual leave"})
        attendance_repo.mark_attendance({"staff_id": "STF-005", "date": today_str, "status": "PRESENT", "check_in_time": "09:05 AM"})

        # 10. Seed Sample Payroll
        cur_year = now.year
        cur_month = now.month
        payroll_repo.create_or_update_payroll({
            "staff_id": "STF-001",
            "staff_name": "Priya Sharma",
            "department": "Front Desk",
            "year": cur_year,
            "month": cur_month,
            "base_salary": to_decimal128(32000.0),
            "present_days": 26,
            "absent_days": 0,
            "leave_days": 2,
            "half_days": 0,
            "overtime_hours": 6.0,
            "overtime_amount": to_decimal128(1200.0),
            "deduction": to_decimal128(0.0),
            "bonus": to_decimal128(2000.0),
            "other_adjustment": to_decimal128(0.0),
            "final_payable_salary": to_decimal128(35200.0),
            "payment_status": "PAID",
            "payment_mode": "BANK_TRANSFER",
            "remarks": "Monthly salary processed with festival performance bonus",
        })

        # 11. Seed Initial Notification
        notifications_repo.create_notification(
            title="System Initialization Complete",
            message="GoldenSwan Hotel Management system initialized with real MongoDB connection.",
            notif_type="INFO",
            link="/dashboard",
        )

        self.stdout.write(self.style.SUCCESS("Demo and seed data populated successfully!"))
        self.stdout.write(self.style.SUCCESS("Login credentials created:"))
        self.stdout.write(" - Admin: admin@goldenswan.com / Admin@12345 (SUPER_ADMIN)")
        self.stdout.write(" - Manager: manager@goldenswan.com / Manager@12345 (MANAGER)")
        self.stdout.write(" - Receptionist: reception@goldenswan.com / Reception@12345 (RECEPTIONIST)")
        self.stdout.write(" - Accountant: accounts@goldenswan.com / Accounts@12345 (ACCOUNTANT)")
