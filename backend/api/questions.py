from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException, status
from typing import List, Optional
from models.question import (
    QuestionCreate,
    QuestionResponse,
    ListBulkQuestionsUpload,
    PracticalSetUpload,
    BulkDeleteQuestionsRequest
)
from services.question_service import QuestionService
from middleware.auth import get_current_user, require_role
import json

router = APIRouter(prefix="/api/questions", tags=["questions"])

def get_question_service():
    return QuestionService()

@router.get("/", response_model=List[QuestionResponse])
async def get_questions(
    theme_id: Optional[str] = Query(None, description="Filter by theme ID"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get all questions with optional filters"""
    question_service = get_question_service()
    questions = question_service.get_questions(theme_id, limit, skip)
    return [QuestionResponse(**q) for q in questions]

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_data: QuestionCreate,
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Create a new question (admin/curator only)"""
    question_service = get_question_service()
    question = question_service.create_question(question_data, current_user["id"])
    return QuestionResponse(**question)

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get question by ID"""
    question_service = get_question_service()
    question = question_service.get_question_by_id(question_id)
    return QuestionResponse(**question)

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    question_data: dict,
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Update a question (admin/curator only)"""
    question_service = get_question_service()
    question = question_service.update_question(question_id, question_data)
    return QuestionResponse(**question)

@router.delete("/{question_id}")
async def delete_question(
    question_id: str,
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Delete a question (admin/curator only)"""
    question_service = get_question_service()
    success = question_service.delete_question(question_id)
    return {"message": "Question deleted successfully", "success": success}


@router.post("/bulk-delete")
async def bulk_delete_questions(
    delete_request: BulkDeleteQuestionsRequest,
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Delete multiple questions (admin/curator only)"""
    question_service = get_question_service()
    result = question_service.delete_questions(delete_request.question_ids)
    return {"message": "Bulk delete finished", **result}

@router.post("/upload/bulk")
async def upload_bulk_questions(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Upload multiple questions from JSON file"""
    try:
        content = await file.read()
        data = json.loads(content)
        
        upload_data = ListBulkQuestionsUpload(**data)
        question_service = get_question_service()
        result = question_service.upload_bulk_questions(upload_data.uploads, current_user["id"])
        
        return result
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/upload/practical-set")
async def upload_practical_set(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin", "curator"]))
):
    """Upload a practical set (15 questions) from JSON file"""
    try:
        content = await file.read()
        data = json.loads(content)
        
        upload_data = PracticalSetUpload(**data)
        question_service = get_question_service()
        result = question_service.upload_practical_set(upload_data, current_user["id"])
        
        return result
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )