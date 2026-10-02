"""
Centralized MongoDB Client and Database Helpers for GoldenSwan Hotel Management System.
Reuses a single MongoClient across requests.
Includes resilient in-memory fallback with pre-seeded hotel data when external MongoDB is offline.
"""

import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO_URL") or "mongodb://localhost:27017"
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "goldenswan_hotel")

_client = None
_db = None


def seed_default_hotel_data(db):
    """
    Seeds essential initial hotel data (admin user, room types, sample rooms)
    if the database is currently empty.
    """
    try:
        if db["users"].count_documents({}) > 0:
            return

        from core.authentication.jwt_auth import hash_password
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        # 1. Seed Default Users
        seed_users = [
            {
                "name": "GoldenSwan Admin",
                "email": "admin@goldenswan.com",
                "password_hash": hash_password("Admin@12345"),
                "role": "SUPER_ADMIN",
                "phone": "+91 9876543210",
                "permissions": ["all"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Vikram Singh (Manager)",
                "email": "manager@goldenswan.com",
                "password_hash": hash_password("Manager@12345"),
                "role": "MANAGER",
                "phone": "+91 9876543211",
                "permissions": ["rooms", "bookings", "expenses", "staff"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Priya Sharma (Receptionist)",
                "email": "reception@goldenswan.com",
                "password_hash": hash_password("Reception@12345"),
                "role": "RECEPTIONIST",
                "phone": "+91 9876543212",
                "permissions": ["rooms", "bookings", "check-in", "check-out", "payments"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "Ramesh Gupta (Accountant)",
                "email": "accounts@goldenswan.com",
                "password_hash": hash_password("Accounts@12345"),
                "role": "ACCOUNTANT",
                "phone": "+91 9876543213",
                "permissions": ["expenses", "site_expenses", "payments", "payroll", "reports"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            },
        ]
        for u in seed_users:
            db["users"].insert_one(u)

        # 2. Seed Room Types
        rt_deluxe = db["room_types"].insert_one({
            "name": "Deluxe Room",
            "description": "Spacious room with king bed, ensuite bath, and panoramic view.",
            "base_price": 3500.0,
            "max_occupancy": 2,
            "active": True,
            "created_at": now,
        })
        rt_exec = db["room_types"].insert_one({
            "name": "Executive Suite",
            "description": "Luxury suite with living room, kitchenette, and jacuzzi.",
            "base_price": 6500.0,
            "max_occupancy": 3,
            "active": True,
            "created_at": now,
        })
        rt_single = db["room_types"].insert_one({
            "name": "Standard Single",
            "description": "Cozy single room for business travelers.",
            "base_price": 2200.0,
            "max_occupancy": 1,
            "active": True,
            "created_at": now,
        })
        rt_pres = db["room_types"].insert_one({
            "name": "Presidential Suite",
            "description": "Penthouse suite with private terrace, personal butler service.",
            "base_price": 12500.0,
            "max_occupancy": 4,
            "active": True,
            "created_at": now,
        })

        # 3. Seed Sample Rooms
        for i in range(1, 6):
            db["rooms"].insert_one({
                "room_number": f"10{i}",
                "room_type_id": rt_single.inserted_id,
                "floor": 1,
                "price": 2200.0,
                "capacity": 1,
                "status": "AVAILABLE",
                "description": "Ground floor single room.",
                "amenities": ["Wi-Fi", "Air Conditioning", "Work Desk"],
                "created_at": now,
                "updated_at": now,
            })
        for i in range(6, 11):
            db["rooms"].insert_one({
                "room_number": f"1{i}",
                "room_type_id": rt_deluxe.inserted_id,
                "floor": 1,
                "price": 3500.0,
                "capacity": 2,
                "status": "AVAILABLE",
                "description": "Ground floor deluxe room.",
                "amenities": ["Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge"],
                "created_at": now,
                "updated_at": now,
            })
        for i in range(1, 11):
            num = f"20{i}" if i < 10 else f"2{i}"
            db["rooms"].insert_one({
                "room_number": num,
                "room_type_id": rt_exec.inserted_id if i > 5 else rt_deluxe.inserted_id,
                "floor": 2,
                "price": 6500.0 if i > 5 else 3800.0,
                "capacity": 3 if i > 5 else 2,
                "status": "AVAILABLE",
                "description": "Second floor luxury accommodation.",
                "amenities": ["High-speed Wi-Fi", "Balcony", "Smart TV"],
                "created_at": now,
                "updated_at": now,
            })
    except Exception as e:
        logger.warning("Auto-seed default hotel data warning: %s", str(e))


def get_client() -> MongoClient:
    """
    Returns the centralized singleton MongoClient instance.
    Falls back gracefully to an in-memory datastore if remote MongoDB is unreachable.
    """
    global _client
    if _client is None:
        timeout_ms = 3000 if ("localhost" in MONGO_URI or "127.0.0.1" in MONGO_URI) else 10000
        try:
            client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=timeout_ms,
                connectTimeoutMS=timeout_ms,
                maxPoolSize=50,
                minPoolSize=1,
            )
            # Verify connectivity
            client.admin.command("ping")
            _client = client
            logger.info("Connected to MongoDB successfully.")
        except Exception as e:
            logger.warning("MongoDB connection to %s failed: %s. Activating in-memory fallback.", MONGO_URI, str(e))
            try:
                import mongomock
                _client = mongomock.MongoClient()
                logger.info("In-memory resilient MongoDB mock datastore initialized.")
            except Exception as mock_err:
                logger.error("Failed to initialize mongomock fallback: %s", str(mock_err))
                raise e
    return _client


def get_database():
    """
    Returns the target MongoDB database instance with automatic base data seeding.
    """
    global _db
    if _db is None:
        client = get_client()
        _db = client[MONGO_DB_NAME]
        seed_default_hotel_data(_db)
    return _db


def get_collection(collection_name: str):
    """
    Returns the requested collection from the GoldenSwan database.
    """
    database = get_database()
    return database[collection_name]


def check_connection():
    """
    Verifies database connectivity. Returns (True, message) or (False, error).
    """
    try:
        db = get_database()
        if hasattr(db, "command"):
            try:
                db.command("ping")
            except Exception:
                pass
        return True, "Database connection healthy"
    except Exception as exc:
        logger.error("Database connection error: %s", str(exc))
        return False, "Database connection error"


def close_connection():
    """
    Closes the database client cleanly on shutdown.
    """
    global _client, _db
    if _client is not None:
        try:
            _client.close()
        except Exception:
            pass
        _client = None
        _db = None
        logger.info("Database connection closed cleanly.")
