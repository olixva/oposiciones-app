from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class Choice(BaseModel):
    id: str
    text: str

class QuestionBase(BaseModel):
    theme_id: str
    text: str
    choices: List[str]  # Simple list of choice texts
    correct_answer: int  # Index of correct choice (0-based)
    difficulty: str = "MEDIUM"  # EASY, MEDIUM, HARD
    tags: List[str] = []

class QuestionCreate(QuestionBase):
    pass

class QuestionInDB(QuestionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuestionResponse(QuestionBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

# Upload models
class QuestionUploadItem(BaseModel):
    text: str
    choices: List[str]
    correct_answer: int
    difficulty: str = "MEDIUM"
    tags: List[str] = []

class BulkQuestionsUpload(BaseModel):
    theme_code: str
    questions: List[QuestionUploadItem]

class ListBulkQuestionsUpload(BaseModel):
    uploads: List[BulkQuestionsUpload]

class PracticalSetQuestion(BaseModel):
    position: int
    text: str
    choices: List[str]
    correct_answer: int

class PracticalSetUpload(BaseModel):
    title: str
    description: str
    questions: List[PracticalSetQuestion]  # Must be exactly 15


class BulkDeleteQuestionsRequest(BaseModel):
    question_ids: List[str]