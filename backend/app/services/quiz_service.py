"""
Quiz Service — generate, save, grade quiz questions
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.quiz import Quiz
from app.models.progress import Progress
from app.services import ai_service
from app.services.document_service import get_document
from app.utils.text_splitter import truncate
from app.schemas.ai import QuizRequest, QuizResponse, QuizQuestion, GradeRequest, GradeResponse
from app.core.exceptions import NotFoundError, ForbiddenError

logger = logging.getLogger(__name__)


async def generate_quiz(req: QuizRequest, user_id: int, db: AsyncSession) -> QuizResponse:
    context = req.topic or ""

    if req.document_id:
        doc = await get_document(req.document_id, user_id, db)
        context = truncate(doc.content or "", max_chars=5000)

    if not context.strip():
        raise ValueError("No content available to generate quiz from")

    raw_questions = await ai_service.generate_quiz(context, req.num_questions)

    saved: list[QuizQuestion] = []
    for q in raw_questions:
        quiz = Quiz(
            user_id=user_id,
            document_id=req.document_id,
            question=q["question"],
            options=q["options"],
            correct_index=q["correct_index"],
            explanation=q.get("explanation", ""),
        )
        db.add(quiz)
        saved.append(QuizQuestion(**q))

    # flush so Quiz rows get their PKs before commit
    await db.flush()

    # Bump total_quizzes (create row if missing)
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if prog is None:
        prog = Progress(user_id=user_id)
        db.add(prog)
        await db.flush()
    prog.total_quizzes += len(saved)

    await db.commit()
    return QuizResponse(questions=saved)


async def grade_quiz(req: GradeRequest, user_id: int, db: AsyncSession) -> GradeResponse:
    result = await db.execute(select(Quiz).where(Quiz.id == req.quiz_id))
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise NotFoundError("Quiz")
    if quiz.user_id != user_id:
        raise ForbiddenError()

    is_correct = req.selected_index == quiz.correct_index

    explanation = await ai_service.grade_answer(
        quiz.question, quiz.options, quiz.correct_index, req.selected_index
    )

    # Save user's answer
    quiz.selected_index = req.selected_index
    quiz.is_correct = is_correct

    # Update accuracy in progress
    prog_result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = prog_result.scalar_one_or_none()
    if prog is None:
        prog = Progress(user_id=user_id)
        db.add(prog)
        await db.flush()

    if is_correct:
        prog.correct_answers += 1

    answered = await db.execute(
        select(Quiz).where(Quiz.user_id == user_id, Quiz.is_correct.isnot(None))
    )
    total_answered = len(answered.scalars().all())
    prog.accuracy = round((prog.correct_answers / max(total_answered, 1)) * 100, 1)

    await db.commit()
    return GradeResponse(
        is_correct=is_correct,
        explanation=explanation,
        correct_index=quiz.correct_index,
    )
