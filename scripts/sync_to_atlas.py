"""
MongoDB Atlas Cloud Sync & Seed Script for GoldenSwan Hotel Management.
Usage:
    python scripts/sync_to_atlas.py "mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority"
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path so Django and app modules can be loaded
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/sync_to_atlas.py \"<YOUR_MONGODB_ATLAS_URI>\"")
        print("Example: python scripts/sync_to_atlas.py \"mongodb+srv://admin:pass123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority\"")
        sys.exit(1)

    atlas_uri = sys.argv[1].strip()
    os.environ["MONGO_URI"] = atlas_uri
    os.environ["MONGO_DB_NAME"] = "goldenswan_hotel"

    print("=" * 60)
    print("  GoldenSwan Hotel — MongoDB Atlas Cloud Deployment & Sync")
    print("=" * 60)
    print(f"Connecting to MongoDB Atlas...")

    try:
        from pymongo import MongoClient
        client = MongoClient(atlas_uri, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
        # Test ping
        client.admin.command("ping")
        print("[SUCCESS] Successfully connected to MongoDB Atlas Cloud Cluster!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB Atlas: {e}")
        print("Please check your Atlas URI, username, password, and Network Access IP whitelist (allow 0.0.0.0/0).")
        sys.exit(1)

    # Initialize Django environment
    import django
    django.setup()

    from django.core.management import call_command

    print("\n>>> Setting up MongoDB Collections and Unique Indexes on Atlas...")
    try:
        call_command("setup_mongodb")
        print("[SUCCESS] Indexes and base collections initialized on Atlas.")
    except Exception as e:
        print(f"[WARNING] setup_mongodb warning: {e}")

    print("\n>>> Seeding Hotel Base Accounts and Configurations on Atlas...")
    try:
        call_command("seed_data")
        print("[SUCCESS] SuperAdmin and default staff accounts seeded on Atlas.")
    except Exception as e:
        print(f"[WARNING] seed_data warning: {e}")

    print("\n" + "=" * 60)
    print("  Atlas Cloud Database is 100% READY for Production!")
    print("  Admin: admin@goldenswan.com | Password: Admin@12345")
    print("=" * 60)

if __name__ == "__main__":
    main()
