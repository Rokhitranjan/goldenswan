"""
Management command to initialize MongoDB collections, unique indexes, and base reference data.
Usage:
    python manage.py setup_mongodb
"""

import sys
from pymongo import ASCENDING, DESCENDING
from django.core.management.base import BaseCommand
from config.mongodb import get_database, check_connection, MONGO_DB_NAME
from core.repositories import room_types_repo, expense_categories_repo


class Command(BaseCommand):
    help = "Initializes MongoDB collections, required indexes, and default hotel configurations."

    def handle(self, *args, **options):
        self.stdout.write("Connecting to MongoDB...")
        connected, msg = check_connection()
        if not connected:
            self.stderr.write(self.style.ERROR(f"Failed to connect to MongoDB: {msg}"))
            sys.exit(1)

        db = get_database()
        self.stdout.write(self.style.SUCCESS(f"Connected to database: {MONGO_DB_NAME}"))

        self.stdout.write("Configuring MongoDB indexes...")

        # 1. Users collection: unique email
        db["users"].create_index([("email", ASCENDING)], unique=True, name="idx_users_email_unique")
        self.stdout.write(" - Created index on users (email [unique])")

        # 2. Rooms collection: unique room_number, status, floor
        db["rooms"].create_index([("room_number", ASCENDING)], unique=True, name="idx_rooms_number_unique")
        db["rooms"].create_index([("status", ASCENDING)], name="idx_rooms_status")
        db["rooms"].create_index([("floor", ASCENDING)], name="idx_rooms_floor")
        self.stdout.write(" - Created indexes on rooms (room_number [unique], status, floor)")

        # 3. Room types collection: unique name
        db["room_types"].create_index([("name", ASCENDING)], unique=True, name="idx_room_types_name_unique")
        self.stdout.write(" - Created index on room_types (name [unique])")

        # 4. Customers collection: phone, name search
        db["customers"].create_index([("phone", ASCENDING)], name="idx_customers_phone")
        db["customers"].create_index([("name", ASCENDING)], name="idx_customers_name")
        self.stdout.write(" - Created indexes on customers (phone, name)")

        # 5. Bookings collection: unique booking_id, room_id, customer_id, dates, statuses
        db["bookings"].create_index([("booking_id", ASCENDING)], unique=True, name="idx_bookings_id_unique")
        db["bookings"].create_index([("room_id", ASCENDING)], name="idx_bookings_room")
        db["bookings"].create_index([("customer_id", ASCENDING)], name="idx_bookings_customer")
        db["bookings"].create_index([("check_in", ASCENDING)], name="idx_bookings_check_in")
        db["bookings"].create_index([("check_out", ASCENDING)], name="idx_bookings_check_out")
        db["bookings"].create_index([("booking_status", ASCENDING)], name="idx_bookings_status")
        db["bookings"].create_index([("payment_status", ASCENDING)], name="idx_bookings_payment_status")
        # Compound index for conflict checking
        db["bookings"].create_index(
            [("room_id", ASCENDING), ("booking_status", ASCENDING), ("check_in", ASCENDING), ("check_out", ASCENDING)],
            name="idx_bookings_conflict_check",
        )
        self.stdout.write(" - Created indexes on bookings (booking_id [unique], room, dates, statuses)")

        # 6. Payments collection: booking_id, customer_id, payment_date
        db["payments"].create_index([("payment_id", ASCENDING)], unique=True, name="idx_payments_id_unique")
        db["payments"].create_index([("booking_id", ASCENDING)], name="idx_payments_booking")
        db["payments"].create_index([("customer_id", ASCENDING)], name="idx_payments_customer")
        db["payments"].create_index([("payment_date", DESCENDING)], name="idx_payments_date")
        self.stdout.write(" - Created indexes on payments (payment_id [unique], booking_id, payment_date)")

        # 7. Expense categories: unique name
        db["expense_categories"].create_index([("name", ASCENDING)], unique=True, name="idx_expense_cats_name_unique")
        self.stdout.write(" - Created index on expense_categories (name [unique])")

        # 8. Expenses collection: date, category_id, payment_status
        db["expenses"].create_index([("expense_id", ASCENDING)], unique=True, name="idx_expenses_id_unique")
        db["expenses"].create_index([("date", DESCENDING)], name="idx_expenses_date")
        db["expenses"].create_index([("category_id", ASCENDING)], name="idx_expenses_category")
        db["expenses"].create_index([("payment_status", ASCENDING)], name="idx_expenses_status")
        self.stdout.write(" - Created indexes on expenses (expense_id [unique], date, category, status)")

        # 9. Vendors collection: name
        db["vendors"].create_index([("name", ASCENDING)], name="idx_vendors_name")
        self.stdout.write(" - Created index on vendors (name)")

        # 10. Site Expenses collection: date, category, vendor_id, payment_status
        db["site_expenses"].create_index([("expense_id", ASCENDING)], unique=True, name="idx_site_expenses_id_unique")
        db["site_expenses"].create_index([("date", DESCENDING)], name="idx_site_expenses_date")
        db["site_expenses"].create_index([("vendor_id", ASCENDING)], name="idx_site_expenses_vendor")
        db["site_expenses"].create_index([("payment_status", ASCENDING)], name="idx_site_expenses_status")
        self.stdout.write(" - Created indexes on site_expenses (expense_id [unique], date, vendor, status)")

        # 11. Staff collection: unique staff_id, phone, department
        db["staff"].create_index([("staff_id", ASCENDING)], unique=True, name="idx_staff_id_unique")
        db["staff"].create_index([("department", ASCENDING)], name="idx_staff_dept")
        self.stdout.write(" - Created indexes on staff (staff_id [unique], department)")

        # 12. Attendance collection: unique compound index staff_id + date
        db["attendance"].create_index(
            [("staff_id", ASCENDING), ("date", ASCENDING)],
            unique=True,
            name="idx_attendance_staff_date_unique",
        )
        self.stdout.write(" - Created index on attendance (staff_id + date [unique])")

        # 13. Payroll collection: unique compound index staff_id + year + month
        db["payroll"].create_index(
            [("staff_id", ASCENDING), ("year", ASCENDING), ("month", ASCENDING)],
            unique=True,
            name="idx_payroll_staff_year_month_unique",
        )
        self.stdout.write(" - Created index on payroll (staff_id + year + month [unique])")

        # 14. Notifications collection: is_read, created_at
        db["notifications"].create_index([("is_read", ASCENDING)], name="idx_notifications_is_read")
        db["notifications"].create_index([("created_at", DESCENDING)], name="idx_notifications_created")

        # 15. Audit logs collection: timestamp, module, action
        db["audit_logs"].create_index([("timestamp", DESCENDING)], name="idx_audit_logs_timestamp")
        db["audit_logs"].create_index([("module", ASCENDING)], name="idx_audit_logs_module")

        self.stdout.write("Setting up base hotel reference data...")

        # Base Pammal Hotel Room Types
        default_room_types = [
            {"name": "Acacia Room", "description": "Single occupancy room for 1 person at Pammal Hotel.", "base_price": 2500.0, "max_occupancy": 1},
            {"name": "Oak Room", "description": "Double occupancy room for 2 persons at Pammal Hotel.", "base_price": 2800.0, "max_occupancy": 2},
            {"name": "Maple Room", "description": "Triple occupancy room for 3 persons at Pammal Hotel.", "base_price": 3500.0, "max_occupancy": 3},
            {"name": "Mahogany Room", "description": "Luxury family suite for 4 persons at Pammal Hotel.", "base_price": 4000.0, "max_occupancy": 4},
        ]
        for rt in default_room_types:
            if not room_types_repo.get_by_name(rt["name"]):
                room_types_repo.create_room_type(rt)
                self.stdout.write(f" + Added base room type: {rt['name']}")

        # Base Expense Categories
        default_categories = [
            {"name": "Daily Maintenance", "description": "Plumbing, electrical, and room repairs"},
            {"name": "Grocery", "description": "Kitchen groceries, food supplies, and beverages"},
            {"name": "Common Expense", "description": "Electricity, water, internet, and municipal utilities"},
            {"name": "Daily Expense", "description": "Front desk supplies, laundry detergent, and petty cash"},
        ]
        for cat in default_categories:
            if not expense_categories_repo.get_by_name(cat["name"]):
                expense_categories_repo.create_category(cat)
                self.stdout.write(f" + Added base expense category: {cat['name']}")

        self.stdout.write(self.style.SUCCESS("MongoDB setup and indexing completed successfully!"))
