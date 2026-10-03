"""
Script to add official Pammal Hotel Room Types and Rooms with tariffs and occupancies.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from bson.decimal128 import Decimal128

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from config.mongodb import get_database

def setup_pammal_rooms():
    db = get_database()
    now = datetime.now(timezone.utc)
    print("=" * 60)
    print("  GOLDENSWAN HOTEL — PAMMAL PROPERTY ROOM SETUP")
    print("=" * 60)

    # 1. Define Pammal Hotel Room Types
    pammal_types = [
        {
            "name": "Acacia Room",
            "base_price": Decimal128("2500.00"),
            "max_occupancy": 1,
            "description": "Acacia Room — Elegantly appointed single room designed for solo travelers and business professionals at Pammal Hotel.",
            "amenities": ["Wi-Fi", "Air Conditioning", "Single Bed", "Work Desk", "Intercom", "Hot Water", "Daily Housekeeping"],
            "count": 4,
            "rooms": [
                {"number": "101", "floor": 1},
                {"number": "102", "floor": 1},
                {"number": "103", "floor": 1},
                {"number": "104", "floor": 1},
            ]
        },
        {
            "name": "Oak Room",
            "base_price": Decimal128("2800.00"),
            "max_occupancy": 2,
            "description": "Oak Room — Spacious double occupancy room featuring double bed, ensuite bath, and modern amenities.",
            "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Double Bed", "Ensuite Bath", "Hot Water", "Daily Housekeeping"],
            "count": 8,
            "rooms": [
                {"number": "105", "floor": 1},
                {"number": "106", "floor": 1},
                {"number": "107", "floor": 1},
                {"number": "108", "floor": 1},
                {"number": "201", "floor": 2},
                {"number": "202", "floor": 2},
                {"number": "203", "floor": 2},
                {"number": "204", "floor": 2},
            ]
        },
        {
            "name": "Maple Room",
            "base_price": Decimal128("3500.00"),
            "max_occupancy": 3,
            "description": "Maple Room — Premium triple occupancy accommodation with plush bedding, seating area, and smart comforts.",
            "amenities": ["High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker", "Daily Housekeeping"],
            "count": 5,
            "rooms": [
                {"number": "205", "floor": 2},
                {"number": "206", "floor": 2},
                {"number": "207", "floor": 2},
                {"number": "208", "floor": 2},
                {"number": "209", "floor": 2},
            ]
        },
        {
            "name": "Mahogany Room",
            "base_price": Decimal128("4000.00"),
            "max_occupancy": 4,
            "description": "Mahogany Room — Luxury family suite with grand bedding, living lounge, and executive comforts.",
            "amenities": ["Ultra High-speed Wi-Fi", "Air Conditioning", "Smart TV", "Living Lounge", "Mini Fridge", "Ensuite Bath", "Tea/Coffee Maker", "Complimentary Breakfast"],
            "count": 2,
            "rooms": [
                {"number": "210", "floor": 2},
                {"number": "211", "floor": 2},
            ]
        },
    ]

    # Deactivate old dummy rooms that are not in Pammal specification
    pammal_room_numbers = set()
    for pt in pammal_types:
        for r in pt["rooms"]:
            pammal_room_numbers.add(r["number"])

    # Mark existing non-pammal rooms as inactive
    db["rooms"].update_many(
        {"room_number": {"$nin": list(pammal_room_numbers)}},
        {"$set": {"active": False, "updated_at": now}}
    )

    # Deactivate old generic room types (Deluxe, Presidential, etc.)
    db["room_types"].update_many(
        {"name": {"$nin": [pt["name"] for pt in pammal_types]}},
        {"$set": {"active": False, "updated_at": now}}
    )

    # Insert or update each Pammal room type and its rooms
    for pt in pammal_types:
        # Upsert room type
        type_doc = db["room_types"].find_one({"name": pt["name"]})
        if type_doc:
            db["room_types"].update_one(
                {"_id": type_doc["_id"]},
                {"$set": {
                    "base_price": pt["base_price"],
                    "max_occupancy": pt["max_occupancy"],
                    "description": pt["description"],
                    "active": True,
                    "updated_at": now,
                }}
            )
            type_id = type_doc["_id"]
            print(f" [OK] Updated Room Type: {pt['name']} | Base Tariff: Rs. {pt['base_price']} | Capacity: {pt['max_occupancy']} Person(s)")
        else:
            ins = db["room_types"].insert_one({
                "name": pt["name"],
                "base_price": pt["base_price"],
                "max_occupancy": pt["max_occupancy"],
                "description": pt["description"],
                "active": True,
                "created_at": now,
                "updated_at": now,
            })
            type_id = ins.inserted_id
            print(f" [+] Created Room Type: {pt['name']} | Base Tariff: Rs. {pt['base_price']} | Capacity: {pt['max_occupancy']} Person(s)")

        # Upsert each room of this type
        for r_spec in pt["rooms"]:
            existing_room = db["rooms"].find_one({"room_number": r_spec["number"]})
            room_payload = {
                "room_number": r_spec["number"],
                "room_type_id": type_id,
                "floor": r_spec["floor"],
                "price": pt["base_price"],
                "capacity": pt["max_occupancy"],
                "status": "AVAILABLE",
                "active": True,
                "description": f"{pt['name']} #{r_spec['number']} (Capacity: {pt['max_occupancy']} Person)",
                "amenities": pt["amenities"],
                "updated_at": now,
            }
            if existing_room:
                # Keep status if already set, but update tariff, capacity, type, and active
                db["rooms"].update_one(
                    {"_id": existing_room["_id"]},
                    {"$set": room_payload}
                )
                print(f"   -> Room #{r_spec['number']} (Floor {r_spec['floor']}) updated -> Rs. {pt['base_price']}")
            else:
                room_payload["created_at"] = now
                db["rooms"].insert_one(room_payload)
                print(f"   -> Room #{r_spec['number']} (Floor {r_spec['floor']}) created -> Rs. {pt['base_price']}")

    total_active_rooms = db["rooms"].count_documents({"active": True})
    print("\n" + "=" * 60)
    print(f"  Pammal Hotel Setup Complete: {total_active_rooms} Active Rooms Configured!")
    print("=" * 60)

if __name__ == "__main__":
    setup_pammal_rooms()
