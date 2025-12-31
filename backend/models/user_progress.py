from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid
from enum import Enum

class OutcomeType(str, Enum):
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    UNANSWERED = "UNANSWERED"

class UserQuestionHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    theme_id: str
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    outcome: OutcomeType
    times_answered: int = 1
