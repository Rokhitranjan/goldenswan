"""
Centralized MongoDB Client and Database Helpers for GoldenSwan Hotel Management System.
Reuses a single MongoClient across requests.
"""

import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "goldenswan_hotel")

_client = None
_db = None


def get_client() -> MongoClient:
    """
    Returns the centralized singleton MongoClient instance.
    Configured with appropriate connection pooling and timeouts.
    """
    global _client
    if _client is None:
        try:
            _client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                maxPoolSize=50,
                minPoolSize=5,
            )
            logger.info("MongoDB client initialized successfully.")
        except Exception as e:
            logger.error("Failed to initialize MongoDB client: %s", str(e))
            raise
    return _client


def get_database():
    """
    Returns the target MongoDB database instance.
    """
    global _db
    if _db is None:
        client = get_client()
        _db = client[MONGO_DB_NAME]
    return _db


def get_collection(collection_name: str):
    """
    Returns the requested collection from the GoldenSwan database.
    Usage:
        rooms_col = get_collection("rooms")
    """
    database = get_database()
    return database[collection_name]


def check_connection():
    """
    Pings MongoDB to verify connectivity.
    Returns (True, "ok") or (False, error_message).
    Sensitive details (passwords/uris) are never leaked in error messages.
    """
    try:
        client = get_client()
        # The ping command is cheap and does not require auth on admin in most setups,
        # or pings the target database directly.
        db = get_database()
        db.command("ping")
        return True, "MongoDB connection healthy"
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        logger.warning("MongoDB ping failed: %s", str(exc))
        return False, "Database connection unavailable or timed out"
    except Exception as exc:
        logger.error("MongoDB ping unexpected error: %s", str(exc))
        return False, "Database connection error"


def close_connection():
    """
    Closes the MongoClient cleanly on application shutdown.
    """
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed cleanly.")
