from repositories.question_repository import QuestionRepository
from repositories.theme_repository import ThemeRepository
from models.question import (
    QuestionCreate, QuestionInDB, BulkQuestionsUpload,
    PracticalSetUpload, QuestionUploadItem
)
from typing import List, Optional
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class QuestionService:
    def __init__(self):
        self.question_repo = QuestionRepository()
        self.theme_repo = ThemeRepository()
    
    def create_question(self, question_data: QuestionCreate, user_id: str) -> dict:
        # Validate theme exists
        theme = self.theme_repo.get_by_id(question_data.theme_id)
        if not theme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Theme not found"
            )
        
        # Validate choices and correct_answer
        if len(question_data.choices) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 choices are required"
            )
        
        if question_data.correct_answer < 0 or question_data.correct_answer >= len(question_data.choices):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid correct_answer index"
            )
        
        question = self.question_repo.create(question_data, user_id)
        return question.model_dump()
    
    def get_questions(self, theme_id: Optional[str] = None, limit: int = 100, skip: int = 0) -> List[dict]:
        return self.question_repo.get_all(theme_id, limit, skip)
    
    def get_question_by_id(self, question_id: str) -> dict:
        question = self.question_repo.get_by_id(question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        return question
    
    def update_question(self, question_id: str, question_data: dict) -> dict:
        existing = self.question_repo.get_by_id(question_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Validate if updating choices/correct_answer
        if "choices" in question_data and "correct_answer" in question_data:
            if question_data["correct_answer"] >= len(question_data["choices"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid correct_answer index"
                )
        
        success = self.question_repo.update(question_id, question_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update question"
            )
        
        return self.question_repo.get_by_id(question_id)
    
    def delete_question(self, question_id: str) -> bool:
        existing = self.question_repo.get_by_id(question_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        return self.question_repo.delete(question_id)
    
    def delete_questions(self, question_ids: List[str]) -> dict:
        if not question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No question IDs provided"
            )
        deleted_count = self.question_repo.delete_many(question_ids)
        not_found = max(len(question_ids) - deleted_count, 0)
        return {
            "requested": len(question_ids),
            "deleted": deleted_count,
            "not_found": not_found
        }
    
    def upload_bulk_questions(self, upload_data_list: List[BulkQuestionsUpload], user_id: str) -> dict:
        """Upload multiple questions for multiple themes"""
        all_created_ids = []
        all_errors = []
        
        for upload_data in upload_data_list:
            # Validate theme exists
            theme = self.theme_repo.get_by_code(upload_data.theme_code)
            if not theme:
                all_errors.append({
                    "theme_code": upload_data.theme_code,
                    "error": f"Theme with code {upload_data.theme_code} not found"
                })
                continue
            
            for idx, q_data in enumerate(upload_data.questions):
                try:
                    # Validate
                    if len(q_data.choices) < 2:
                        all_errors.append({
                            "theme_code": upload_data.theme_code,
                            "line": idx + 1,
                            "error": "At least 2 choices required"
                        })
                        continue
                    
                    if q_data.correct_answer < 0 or q_data.correct_answer >= len(q_data.choices):
                        all_errors.append({
                            "theme_code": upload_data.theme_code,
                            "line": idx + 1,
                            "error": "Invalid correct_answer index"
                        })
                        continue
                    
                    # Create question
                    question_create = QuestionCreate(
                        theme_id=theme["id"],
                        text=q_data.text,
                        choices=q_data.choices,
                        correct_answer=q_data.correct_answer,
                        difficulty=q_data.difficulty,
                        tags=q_data.tags
                    )
                    
                    question = self.question_repo.create(question_create, user_id)
                    all_created_ids.append(question.id)
                    
                except Exception as e:
                    all_errors.append({
                        "theme_code": upload_data.theme_code,
                        "line": idx + 1,
                        "error": str(e)
                    })
        
        return {
            "success": len(all_created_ids),
            "errors": len(all_errors),
            "created_ids": all_created_ids,
            "error_details": all_errors
        }
    
    def upload_practical_set(self, upload_data: PracticalSetUpload, user_id: str) -> dict:
        """Upload a practical set (exactly 15 questions)"""
        if len(upload_data.questions) != 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Practical set must contain exactly 15 questions"
            )
        
        # For MVP, we'll store practical sets as regular questions with special tags
        # In Phase 2, we can add a dedicated practical_sets collection
        
        # Find or use a default theme for practical sets
        # For now, we'll require theme to be specified in future iterations
        # Store as individual questions with special metadata
        
        created_questions = []
        errors = []
        
        for q_data in upload_data.questions:
            try:
                if len(q_data.choices) < 2:
                    errors.append({"position": q_data.position, "error": "At least 2 choices required"})
                    continue
                
                if q_data.correct_answer < 0 or q_data.correct_answer >= len(q_data.choices):
                    errors.append({"position": q_data.position, "error": "Invalid correct_answer"})
                    continue
                
                # For MVP, we'll store metadata about practical set in tags
                # This allows us to retrieve them as a set later
                # TODO: In Phase 2, create dedicated practical_sets collection
                
            except Exception as e:
                errors.append({"position": q_data.position, "error": str(e)})
        
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation errors in practical set",
                headers={"errors": str(errors)}
            )
        
        return {
            "message": "Practical set upload will be fully implemented in Phase 2",
            "title": upload_data.title,
            "question_count": len(upload_data.questions)
        }