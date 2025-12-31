from repositories.exam_repository import ExamRepository
from repositories.question_repository import QuestionRepository
from models.exam import (
    ExamCreate, ExamInDB, QuestionSnapshot, 
    AttemptStart, AttemptInDB, AnswerSubmit
)
from models.user_progress import OutcomeType
from repositories.history_repository import HistoryRepository
import random
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

EXAM_NOT_FOUND_MESSAGE = "Exam not found"
ATTEMPT_NOT_FOUND_MESSAGE = "Attempt not found"
NOT_AUTHORIZED_MESSAGE = "Not authorized"

class ExamService:
    def __init__(self):
        self.exam_repo = ExamRepository()
        self.question_repo = QuestionRepository()
        self.history_repo = HistoryRepository()
        # Import here to avoid circular dependency
        from services.analytics_service import AnalyticsService
        self.analytics_service = AnalyticsService()
    
    def generate_exam(self, exam_data: ExamCreate, user_id: str) -> dict:
        """Generate an exam by selecting random questions from specified themes"""
        
        # Special handling for SIMULACRO type
        if exam_data.type == "SIMULACRO":
            return self._generate_simulacro(exam_data, user_id)
        
        # Validate theme_ids
        if not exam_data.theme_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one theme must be specified"
            )
        
        # Get random questions from themes
        # Get questions using smart selection strategy
        questions = self._select_smart_questions(
            theme_ids=exam_data.theme_ids,
            count=exam_data.question_count,
            user_id=user_id
        )
        
        if len(questions) < exam_data.question_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough questions available. Found {len(questions)}, requested {exam_data.question_count}"
            )
        
        # Create snapshots of questions
        question_snapshots = []
        for q in questions:
            snapshot = QuestionSnapshot(
                question_id=q["id"],
                text=q["text"],
                choices=q["choices"],
                correct_answer=q["correct_answer"],
                theme_id=q["theme_id"]
            )
            question_snapshots.append(snapshot)
        
        # Create exam
        exam = ExamInDB(
            type=exam_data.type,
            name=exam_data.name,
            theme_ids=exam_data.theme_ids,
            questions=question_snapshots,
            created_by=user_id
        )
        
        created_exam = self.exam_repo.create_exam(exam)
        
        return {
            "id": created_exam.id,
            "type": created_exam.type,
            "name": created_exam.name,
            "theme_ids": created_exam.theme_ids,
            "question_count": len(created_exam.questions),
            "created_at": created_exam.created_at
        }
    
    def _generate_simulacro(self, exam_data: ExamCreate, user_id: str) -> dict:
        """Generate simulacro with 40 questions: 30% general (12) + 70% specific (28)"""
        from repositories.theme_repository import ThemeRepository
        theme_repo = ThemeRepository()
        
        # Get all general and specific themes
        general_themes = theme_repo.get_all(part="GENERAL")
        specific_themes = theme_repo.get_all(part="SPECIFIC")
        
        if not general_themes or not specific_themes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="General or specific themes not found. Please seed themes first."
            )
        
        general_theme_ids = [t["id"] for t in general_themes]
        specific_theme_ids = [t["id"] for t in specific_themes]
        
        # Get 12 questions from general themes (30% of 40)
        general_questions = self._select_smart_questions(general_theme_ids, 12, user_id)
        
        # Get 28 questions from specific themes (70% of 40)
        specific_questions = self._select_smart_questions(specific_theme_ids, 28, user_id)
        
        if len(general_questions) < 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough general questions. Found {len(general_questions)}, need 12"
            )
        
        if len(specific_questions) < 28:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough specific questions. Found {len(specific_questions)}, need 28"
            )
        
        # Combine questions
        all_questions = general_questions + specific_questions
        
        # Create snapshots
        question_snapshots = []
        for q in all_questions:
            snapshot = QuestionSnapshot(
                question_id=q["id"],
                text=q["text"],
                choices=q["choices"],
                correct_answer=q["correct_answer"],
                theme_id=q["theme_id"]
            )
            question_snapshots.append(snapshot)
        
        # Create exam
        exam = ExamInDB(
            type="SIMULACRO",
            name=exam_data.name or "Simulacro Completo",
            theme_ids=general_theme_ids + specific_theme_ids,
            questions=question_snapshots,
            created_by=user_id
        )
        
        created_exam = self.exam_repo.create_exam(exam)
        
        return {
            "id": created_exam.id,
            "type": created_exam.type,
            "name": created_exam.name,
            "theme_ids": created_exam.theme_ids,
            "question_count": len(created_exam.questions),
            "general_questions": 12,
            "specific_questions": 28,
            "created_at": created_exam.created_at
        }
    
    def get_exam(self, exam_id: str) -> dict:
        """Get exam details"""
        exam = self.exam_repo.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=EXAM_NOT_FOUND_MESSAGE
            )
        return exam
    
    def start_attempt(self, exam_id: str, user_id: str) -> dict:
        """Start a new exam attempt"""
        exam = self.exam_repo.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=EXAM_NOT_FOUND_MESSAGE
            )
        
        attempt = AttemptInDB(
            exam_id=exam_id,
            user_id=user_id
        )
        
        created_attempt = self.exam_repo.create_attempt(attempt)
        
        return {
            "id": created_attempt.id,
            "exam_id": created_attempt.exam_id,
            "started_at": created_attempt.started_at,
            "exam": exam
        }
    
    def submit_answer(self, attempt_id: str, answer: AnswerSubmit, user_id: str) -> dict:
        """Submit an answer for a question in an attempt"""
        attempt = self.exam_repo.get_attempt_by_id(attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ATTEMPT_NOT_FOUND_MESSAGE
            )
        
        if attempt["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=NOT_AUTHORIZED_MESSAGE
            )
        
        if attempt.get("finished_at"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attempt already finished"
            )
        
        # Update answers
        answers = attempt.get("answers", {})
        answers[answer.question_id] = answer.selected_answer
        
        self.exam_repo.update_attempt(attempt_id, {"answers": answers})
        
        return {"message": "Answer recorded", "question_id": answer.question_id}
    
    def finish_attempt(self, attempt_id: str, user_id: str) -> dict:
        """Finish attempt and calculate score"""
        attempt = self.exam_repo.get_attempt_by_id(attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ATTEMPT_NOT_FOUND_MESSAGE
            )
        
        if attempt["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=NOT_AUTHORIZED_MESSAGE
            )
        
        if attempt.get("finished_at"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attempt already finished"
            )
        
        # Get exam
        exam = self.exam_repo.get_exam_by_id(attempt["exam_id"])
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=EXAM_NOT_FOUND_MESSAGE
            )
        
        # Calculate score with exam type
        score_result = self._calculate_score(exam["questions"], attempt.get("answers", {}), exam["type"])
        
        # Update attempt
        update_data = {
            "finished_at": datetime.now(timezone.utc),
            "score": score_result["final_score"],
            "details": score_result
        }
        
        self.exam_repo.update_attempt(attempt_id, update_data)
        
        # Record analytics
        try:
            self.analytics_service.record_attempt_results(
                attempt_id=attempt_id,
                user_id=user_id,
                results=score_result["results"]
            )
            
            # Record question history
            for result in score_result["results"]:
                outcome = OutcomeType.UNANSWERED
                if result["status"] == "correct":
                    outcome = OutcomeType.CORRECT
                elif result["status"] == "incorrect":
                    outcome = OutcomeType.INCORRECT
                    
                self.history_repo.upsert_interaction(
                    user_id=user_id,
                    question_id=result["question_id"],
                    theme_id=result.get("theme_id", "unknown"),
                    outcome=outcome
                )
                
        except Exception as e:
            logger.error(f"Failed to record analytics: {e}")
            # Don't fail the attempt if analytics fails
        
        return {
            "attempt_id": attempt_id,
            "score": score_result["final_score"],
            "details": score_result
        }
    
    def _calculate_score(self, questions: List[dict], answers: Dict[str, Any], exam_type: str = "THEORY") -> dict:
        """Calculate exam score based on rules: +1 correct, -0.25 incorrect, 0 unanswered"""
        total_questions = len(questions)
        correct = 0
        incorrect = 0
        unanswered = 0
        results = []
        
        for question in questions:
            question_id = question["question_id"]
            correct_answer = question["correct_answer"]
            selected_answer = answers.get(question_id)
            
            is_correct = False
            status = "unanswered"
            
            if selected_answer is None:
                unanswered += 1
            elif selected_answer == correct_answer:
                correct += 1
                is_correct = True
                status = "correct"
            else:
                incorrect += 1
                status = "incorrect"
            
            results.append({
                "question_id": question_id,
                "question_text": question["text"],
                "choices": question.get("choices", []),
                "theme_id": question.get("theme_id"),  # Include theme_id for analytics
                "selected_answer": selected_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "status": status
            })
        
        # Calculate raw score
        raw_score = (correct * 1.0) + (incorrect * -0.25)
        raw_score = max(raw_score, 0)  # Non-negative
        
        # Scale based on exam type
        # SIMULACRO: scale to 100, others: scale to 70
        scale = 100 if exam_type == "SIMULACRO" else 70
        final_score = (raw_score / total_questions) * scale if total_questions > 0 else 0
        
        return {
            "total_questions": total_questions,
            "correct": correct,
            "incorrect": incorrect,
            "unanswered": unanswered,
            "raw_score": raw_score,
            "final_score": round(final_score, 2),
            "scale": scale,
            "exam_type": exam_type,
            "results": results
        }
    
    def get_attempt_results(self, attempt_id: str, user_id: str) -> dict:
        """Get attempt results"""
        attempt = self.exam_repo.get_attempt_by_id(attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ATTEMPT_NOT_FOUND_MESSAGE
            )
        
        if attempt["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=NOT_AUTHORIZED_MESSAGE
            )
        
        exam = self.exam_repo.get_exam_by_id(attempt["exam_id"])
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=EXAM_NOT_FOUND_MESSAGE
            )

        details = self._ensure_attempt_details(attempt, exam, attempt_id)
        attempt["details"] = details
        attempt["exam"] = self._build_exam_summary(exam)
        return attempt
    
    def get_user_exam_history(self, user_id: str, limit: int = 50) -> List[dict]:
        """Get user's exam history"""
        attempts = self.exam_repo.get_attempts_by_user(user_id, limit)
        
        history = []
        for attempt in attempts:
            exam = self.exam_repo.get_exam_by_id(attempt["exam_id"])
            
            history.append({
                "attempt_id": attempt["id"],
                "exam_id": attempt["exam_id"],
                "exam_name": exam["name"] if exam else "Unknown",
                "exam_type": exam["type"] if exam else "Unknown",
                "started_at": attempt["started_at"],
                "finished_at": attempt.get("finished_at"),
                "score": attempt.get("score"),
                "is_completed": attempt.get("finished_at") is not None
            })
        
        return history

    def _ensure_attempt_details(self, attempt: dict, exam: dict, attempt_id: str) -> dict:
        details = attempt.get("details")
        if details:
            return self._enrich_details_with_exam(details, exam)
        score_result = self._calculate_score(
            exam.get("questions", []),
            attempt.get("answers", {}),
            exam.get("type", "THEORY")
        )
        self.exam_repo.update_attempt(
            attempt_id,
            {"details": score_result, "score": score_result["final_score"]}
        )
        return score_result

    def _enrich_details_with_exam(self, details: dict, exam: dict) -> dict:
        results = details.get("results") or []
        if not results:
            return details
        question_lookup = {
            q.get("question_id"): q for q in exam.get("questions", [])
        }
        enriched_results = [
            self._merge_result_with_question(result, question_lookup.get(result.get("question_id")))
            for result in results
        ]
        return {**details, "results": enriched_results}

    @staticmethod
    def _merge_result_with_question(result: dict, question: Optional[dict]) -> dict:
        question_text = result.get("question_text") or (question and question.get("text"))
        choices = result.get("choices") or (question and question.get("choices", [])) or []
        correct_answer = result.get("correct_answer")
        if correct_answer is None and question is not None:
            correct_answer = question.get("correct_answer")
        return {
            **result,
            "question_text": question_text,
            "choices": choices,
            "correct_answer": correct_answer
        }

    @staticmethod
    def _build_exam_summary(exam: dict) -> dict:
        return {
            "id": exam.get("id"),
            "name": exam.get("name"),
            "type": exam.get("type"),
            "question_count": len(exam.get("questions", []))
        }

    def _select_smart_questions(self, theme_ids: List[str], count: int, user_id: str) -> List[dict]:
        """
        Select questions prioritizing:
        1. Never seen questions (random order among them)
        2. Questions last answered incorrectly (oldest last_seen first)
        3. Other seen questions (oldest last_seen first)
        """
        # Get all candidates
        candidates = self.question_repo.get_by_themes(theme_ids)
        
        if not candidates:
            return []
            
        # Get user history
        history_map = self.history_repo.get_user_history_by_themes(user_id, theme_ids)
        
        unseen = []
        seen = []
        
        for q in candidates:
            q_id = q.get("id")
            if q_id in history_map:
                # Attach history info for sorting
                q["_history"] = history_map[q_id]
                seen.append(q)
            else:
                unseen.append(q)
        
        # Randomize unseen to avoid same order every time for new questions
        random.shuffle(unseen)
        
        # Split seen into failed and others (correct/unanswered)
        failed = []
        others = []
        
        for q in seen:
            outcome = q["_history"].get("outcome")
            if outcome == OutcomeType.INCORRECT:
                failed.append(q)
            else:
                others.append(q)
        
        # Sort both groups by last_seen ascending (oldest first)
        failed.sort(key=lambda x: x["_history"].get("last_seen", datetime.min))
        others.sort(key=lambda x: x["_history"].get("last_seen", datetime.min))
        
        # Combine: Unseen first, then Failed (oldest first), then Others (oldest first)
        selected = (unseen + failed + others)[:count]
        
        # Cleanup internal field
        for q in selected:
            if "_history" in q:
                del q["_history"]
                
        return selected