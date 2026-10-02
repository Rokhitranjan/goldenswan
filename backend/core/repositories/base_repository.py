"""
Base Repository for GoldenSwan Hotel.
Provides reusable CRUD operations over MongoDB collections.
"""

from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from core.database import get_collection
from core.serializers.mongodb import to_object_id


class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return get_collection(self.collection_name)

    def insert_one(self, data: Dict[str, Any]) -> ObjectId:
        result = self.collection.insert_one(data)
        return result.inserted_id

    def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        return self.collection.find_one(query, projection)

    def get_by_id(self, doc_id: Union[str, ObjectId], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        oid = to_object_id(doc_id)
        if not oid:
            return None
        return self.find_one({"_id": oid}, projection)

    def find(
        self,
        query: Dict[str, Any],
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: int = 0,
        projection: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query, projection)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)

    def count(self, query: Dict[str, Any]) -> int:
        return self.collection.count_documents(query)

    def update_one(self, query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        if not any(k.startswith("$") for k in update_data.keys()):
            update_op = {"$set": update_data}
        else:
            update_op = update_data
        result = self.collection.update_one(query, update_op)
        return result.modified_count > 0 or result.matched_count > 0

    def update_by_id(self, doc_id: Union[str, ObjectId], update_data: Dict[str, Any]) -> bool:
        oid = to_object_id(doc_id)
        if not oid:
            return False
        return self.update_one({"_id": oid}, update_data)

    def delete_one(self, query: Dict[str, Any]) -> bool:
        result = self.collection.delete_one(query)
        return result.deleted_count > 0

    def delete_by_id(self, doc_id: Union[str, ObjectId]) -> bool:
        oid = to_object_id(doc_id)
        if not oid:
            return False
        return self.delete_one({"_id": oid})

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return list(self.collection.aggregate(pipeline))
