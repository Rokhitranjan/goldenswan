"""
MongoDB Serialization and Deserialization Utilities for GoldenSwan Hotel.
Safely converts MongoDB documents, ObjectIds, Datetimes, and Decimal128 into JSON-compatible values.
"""

from decimal import Decimal
from datetime import datetime, date
from bson import ObjectId, Decimal128
from typing import Any, Union, Optional


def to_object_id(val: Union[str, ObjectId, None]) -> Optional[ObjectId]:
    """
    Safely convert string or ObjectId into ObjectId. Returns None if invalid or None.
    """
    if not val:
        return None
    if isinstance(val, ObjectId):
        return val
    try:
        return ObjectId(str(val))
    except Exception:
        return None


def to_decimal128(val: Union[Decimal, float, int, str, Decimal128, None]) -> Decimal128:
    """
    Safely convert numeric value or string into BSON Decimal128 for safe storage in MongoDB.
    Avoids floating point inaccuracies.
    """
    if val is None or val == "":
        return Decimal128(Decimal("0.00"))
    if isinstance(val, Decimal128):
        return val
    if isinstance(val, Decimal):
        return Decimal128(val.quantize(Decimal("0.01")))
    # Normalize via string to avoid float precision artifacts (e.g., 10000.4999999)
    try:
        dec = Decimal(str(val)).quantize(Decimal("0.01"))
        return Decimal128(dec)
    except Exception:
        return Decimal128(Decimal("0.00"))


def mongo_to_json(doc: Any) -> Any:
    """
    Recursively converts MongoDB documents and data structures into JSON-serializable primitives.
    Handles:
    - ObjectId -> str (also exposes both 'id' and '_id')
    - Decimal128 -> float (rounded to 2 decimal places)
    - Decimal -> float
    - datetime / date -> ISO8601 string
    - lists, tuples, sets, and nested dicts
    """
    if doc is None:
        return None

    if isinstance(doc, ObjectId):
        return str(doc)

    if isinstance(doc, Decimal128):
        # Convert Decimal128 -> Decimal -> float for JSON numbers
        return float(str(doc))

    if isinstance(doc, Decimal):
        return float(doc)

    if isinstance(doc, (datetime, date)):
        return doc.isoformat()

    if isinstance(doc, dict):
        res = {}
        for k, v in doc.items():
            res[k] = mongo_to_json(v)

        # Ensure both 'id' and '_id' exist as strings if '_id' is present
        if "_id" in res:
            res["id"] = str(res["_id"])
            res["_id"] = str(res["_id"])

        return res

    if isinstance(doc, (list, tuple, set)):
        return [mongo_to_json(item) for item in doc]

    return doc
