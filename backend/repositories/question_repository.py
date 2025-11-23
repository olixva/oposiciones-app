from config.database import get_database
from models.question import QuestionInDB, QuestionCreate
from typing import List, Optional
import logging
import random

logger = logging.getLogger(__name__)

class QuestionRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.questions
    
    def create(self, question_data: QuestionCreate, created_by: str) -> QuestionInDB:
        question = QuestionInDB(**question_data.model_dump(), created_by=created_by)
        question_dict = question.model_dump()
        self.collection.insert_one(question_dict)
        logger.info(f"Question created: {question.id}")
        return question
    
    def get_by_id(self, question_id: str) -> Optional[dict]:
        return self.collection.find_one({"id": question_id}, {"_id": 0})
    
    def get_all(self, theme_id: Optional[str] = None, limit: int = 100, skip: int = 0) -> List[dict]:
        query = {}
        if theme_id:
            query["theme_id"] = theme_id
        
        questions = list(
            self.collection.find(query, {"_id": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return questions
    
    def update(self, question_id: str, question_data: dict) -> bool:
        result = self.collection.update_one(
            {"id": question_id},
            {"$set": question_data}
        )
        return result.modified_count > 0
    
    def delete(self, question_id: str) -> bool:
        result = self.collection.delete_one({"id": question_id})
        return result.deleted_count > 0
    
    def delete_many(self, question_ids: List[str]) -> int:
        if not question_ids:
            return 0
        result = self.collection.delete_many({"id": {"$in": question_ids}})
        return result.deleted_count
    
    def get_random_by_themes(self, theme_ids: List[str], count: int) -> List[dict]:
        """Get random questions from specified themes"""
        pipeline = [
            {"$match": {"theme_id": {"$in": theme_ids}}},
            {"$sample": {"size": count}},
            {"$project": {"_id": 0}}
        ]
        questions = list(self.collection.aggregate(pipeline))
        return questions
    
    def bulk_create(self, questions: List[QuestionInDB]):
        """Bulk insert questions"""
        if questions:
            question_docs = [q.model_dump() for q in questions]
            self.collection.insert_many(question_docs)
            logger.info(f"Bulk created {len(question_docs)} questions")
    
    def count_by_theme(self, theme_id: str) -> int:
        return self.collection.count_documents({"theme_id": theme_id})