"""
Core Database Module for GoldenSwan Hotel.
Provides clean accessors to MongoDB database and collections.
"""

from config.mongodb import (
    get_client,
    get_database,
    get_collection,
    check_connection,
    close_connection,
    MONGO_DB_NAME,
)

__all__ = [
    "get_client",
    "get_database",
    "get_collection",
    "check_connection",
    "close_connection",
    "MONGO_DB_NAME",
]
