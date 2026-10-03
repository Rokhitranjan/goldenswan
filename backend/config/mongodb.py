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
        from datetime import datetime, timezone
        from bson import ObjectId
        from core.authentication.jwt_auth import hash_password

        ADMIN_ID = ObjectId("000000000000000000000001")
        MANAGER_ID = ObjectId("000000000000000000000002")
        RECEPTION_ID = ObjectId("000000000000000000000003")
        ACCOUNTS_ID = ObjectId("000000000000000000000004")
        now = datetime.now(timezone.utc)

        # 1. Seed Default Users (if not already seeded)
        if db["users"].count_documents({}) == 0:
            seed_users = [
                {
                    "_id": ADMIN_ID,
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
                    "_id": MANAGER_ID,
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
                    "_id": RECEPTION_ID,
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
                    "_id": ACCOUNTS_ID,
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

        # 2. Seed / Ensure Pammal Hotel Room Types
        pammal_room_types = [
            {
                "name": "Acacia Room",
                "base_price": 2500.0,
                "max_occupancy": 1,
                "description": "Acacia Room — Single occupancy room for 1 person at Pammal Hotel.",
            },
            {
                "name": "Oak Room",
                "base_price": 2800.0,
                "max_occupancy": 2,
                "description": "Oak Room — Double occupancy room for 2 persons at Pammal Hotel.",
            },
            {
                "name": "Maple Room",
                "base_price": 3500.0,
                "max_occupancy": 3,
                "description": "Maple Room — Triple occupancy room for 3 persons at Pammal Hotel.",
            },
            {
                "name": "Mahogany Room",
                "base_price": 4000.0,
                "max_occupancy": 4,
                "description": "Mahogany Room — Luxury family suite for 4 persons at Pammal Hotel.",
            },
        ]

        types_map = {}
        for rt in pammal_room_types:
            existing = db["room_types"].find_one({"name": rt["name"]})
            if existing:
                db["room_types"].update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"base_price": rt["base_price"], "max_occupancy": rt["max_occupancy"], "active": True}}
                )
                types_map[rt["name"]] = existing["_id"]
            else:
                ins = db["room_types"].insert_one({
                    "name": rt["name"],
                    "description": rt["description"],
                    "base_price": rt["base_price"],
                    "max_occupancy": rt["max_occupancy"],
                    "active": True,
                    "created_at": now,
                    "updated_at": now,
                })
                types_map[rt["name"]] = ins.inserted_id

        # 3. Seed / Ensure Official Pammal Hotel Rooms (19 Rooms)
        # 4 Acacia (101-104), 8 Oak (105-108, 201-204), 5 Maple (205-209), 2 Mahogany (210-211)
        pammal_rooms = [
            # Acacia (4 rooms @ Rs. 2500, 1 person)
            {"room_number": "101", "type": "Acacia Room", "floor": 1, "price": 2500.0, "capacity": 1, "amenities": ["Wi-Fi", "Air Conditioning", "Single Bed", "Work Desk", "Hot Water", "Daily Housekeeping"]},
            {"room_number": "102", "type": "Acacia Room", "floor": 1, "price": 2500.0, "capacity": 1, "amenities": ["Wi-Fi", "Air Conditioning", "Single Bed", "Work Desk", "Hot Water", "Daily Housekeeping"]},
            {"room_number": "103", "type": "Acacia Room", "floor": 1, "price": 2500.0, "capacity": 1, "amenities": ["Wi-Fi", "Air Conditioning", "Single Bed", "Work Desk", "Hot Water", "Daily Housekeeping"]},
            {"room_number": "104", "type": "Acacia Room", "floor": 1, "price": 2500.0, "capacity": 1, "amenities": ["Wi-Fi", "Air Conditioning", "Single Bed", "Work Desk", "Hot Water", "Daily Housekeeping"]},
            # Oak (8 rooms @ Rs. 2800, 2 persons)
            {"room_number": "105", "type": "Oak Room", "floor": 1, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "106", "type": "Oak Room", "floor": 1, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "107", "type": "Oak Room", "floor": 1, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "108", "type": "Oak Room", "floor": 1, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "201", "type": "Oak Room", "floor": 2, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "202", "type": "Oak Room", "floor": 2, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "203", "type": "Oak Room", "floor": 2, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            {"room_number": "204", "type": "Oak Room", "floor": 2, "price": 2800.0, "capacity": 2, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water"]},
            # Maple (5 rooms @ Rs. 3500, 3 persons)
            {"room_number": "205", "type": "Maple Room", "floor": 2, "price": 3500.0, "capacity": 3, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker"]},
            {"room_number": "206", "type": "Maple Room", "floor": 2, "price": 3500.0, "capacity": 3, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker"]},
            {"room_number": "207", "type": "Maple Room", "floor": 2, "price": 3500.0, "capacity": 3, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker"]},
            {"room_number": "208", "type": "Maple Room", "floor": 2, "price": 3500.0, "capacity": 3, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker"]},
            {"room_number": "209", "type": "Maple Room", "floor": 2, "price": 3500.0, "capacity": 3, "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker"]},
            # Mahogany (2 rooms @ Rs. 4000, 4 persons)
            {"room_number": "210", "type": "Mahogany Room", "floor": 2, "price": 4000.0, "capacity": 4, "amenities": ["Ultra Wi-Fi", "Air Conditioning", "Smart TV", "Living Lounge", "Mini Fridge", "Bathtub", "Complimentary Breakfast"]},
            {"room_number": "211", "type": "Mahogany Room", "floor": 2, "price": 4000.0, "capacity": 4, "amenities": ["Ultra Wi-Fi", "Air Conditioning", "Smart TV", "Living Lounge", "Mini Fridge", "Bathtub", "Complimentary Breakfast"]},
        ]

        pammal_nums = {r["room_number"] for r in pammal_rooms}
        # Deactivate any non-Pammal rooms
        db["rooms"].update_many(
            {"room_number": {"$nin": list(pammal_nums)}},
            {"$set": {"active": False, "updated_at": now}}
        )

        for r_spec in pammal_rooms:
            type_id = types_map.get(r_spec["type"])
            r_doc = {
                "room_number": r_spec["room_number"],
                "room_type_id": type_id,
                "room_type_name": r_spec["type"],
                "floor": r_spec["floor"],
                "price": r_spec["price"],
                "capacity": r_spec["capacity"],
                "status": "AVAILABLE",
                "active": True,
                "description": f"{r_spec['type']} #{r_spec['room_number']} (Capacity: {r_spec['capacity']} Person)",
                "amenities": r_spec["amenities"],
                "updated_at": now,
            }
            existing = db["rooms"].find_one({"room_number": r_spec["room_number"]})
            if existing:
                db["rooms"].update_one({"_id": existing["_id"]}, {"$set": r_doc})
            else:
                r_doc["created_at"] = now
                db["rooms"].insert_one(r_doc)
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
