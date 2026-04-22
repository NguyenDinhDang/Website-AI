"""
AI Service — single entry point for all LLM calls.
Wraps OpenAI with retry logic and structured prompt builders.
Never called directly from routers — always via feature services.
"""

import asyncio
import logging
import json
from typing import Any

from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError
from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=settings.AI_REQUEST_TIMEOUT,
        )
    return _client


# ── Low-level call with retry ─────────────────────────────────────────────────

async def _chat_completion(messages: list[dict], temperature: float = 0.7) -> str:
    """
    Call OpenAI chat completion with exponential-backoff retry.
    Returns the assistant message text.
    """
    client = get_openai_client()
    last_exc: Exception | None = None

    for attempt in range(1, settings.AI_MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL_NAME,
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""

        except RateLimitError as exc:
            wait = settings.AI_RETRY_DELAY * (2 ** (attempt - 1))
            logger.warning("Rate limit hit (attempt %d/%d) — retrying in %.1fs", attempt, settings.AI_MAX_RETRIES, wait)
            last_exc = exc
            await asyncio.sleep(wait)

        except APITimeoutError as exc:
            logger.warning("OpenAI timeout (attempt %d/%d)", attempt, settings.AI_MAX_RETRIES)
            last_exc = exc
            await asyncio.sleep(settings.AI_RETRY_DELAY)

        except APIError as exc:
            logger.error("OpenAI API error: %s", exc)
            raise AppException(502, f"AI service error: {exc.message}")

    raise AppException(503, f"AI service unavailable after {settings.AI_MAX_RETRIES} retries: {last_exc}")


# ── High-level AI operations ──────────────────────────────────────────────────

async def summarize(text: str) -> str:
    """Summarize a document chunk into concise bullet points."""
    messages = [
        {
            "role": "system",
            "content": (
                "Bạn là trợ lý học tập thông minh. "
                "Hãy tóm tắt tài liệu bên dưới bằng tiếng Việt, "
                "sử dụng bullet points rõ ràng, ngắn gọn."
            ),
        },
        {"role": "user", "content": f"Tóm tắt tài liệu sau:\n\n{text}"},
    ]
    return await _chat_completion(messages, temperature=0.3)


async def generate_quiz(text: str, num_questions: int = 5) -> list[dict]:
    """
    Generate multiple-choice questions from document text.
    Returns a list of dicts with keys: question, options, correct_index, explanation
    """
    messages = [
        {
            "role": "system",
            "content": (
                "Bạn là giáo viên chuyên tạo bài kiểm tra trắc nghiệm. "
                "Luôn trả về ĐÚNG định dạng JSON sau, không thêm text ngoài:\n"
                '{"questions": [{"question": "...", "options": ["A","B","C","D"], '
                '"correct_index": 0, "explanation": "..."}]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Tạo {num_questions} câu hỏi trắc nghiệm 4 đáp án "
                f"từ nội dung sau (bằng tiếng Việt):\n\n{text}"
            ),
        },
    ]
    raw = await _chat_completion(messages, temperature=0.6)
    return _parse_quiz_json(raw, num_questions)


async def chat_qa(question: str, context: str = "") -> str:
    """Answer a student question, optionally grounded in document context."""
    system = (
        "Bạn là trợ lý học tập AI. Trả lời câu hỏi của sinh viên "
        "một cách rõ ràng, chính xác bằng tiếng Việt."
    )
    user_msg = question
    if context:
        user_msg = f"Dựa vào tài liệu sau:\n\n{context}\n\nCâu hỏi: {question}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]
    return await _chat_completion(messages, temperature=0.5)


async def explain(text: str, context: str = "") -> str:
    """Explain a concept or passage in simple terms."""
    base = "Hãy giải thích đoạn nội dung sau một cách đơn giản, dễ hiểu bằng tiếng Việt:\n\n"
    content = (f"Ngữ cảnh tài liệu:\n{context}\n\n" if context else "") + base + text
    messages = [
        {
            "role": "system",
            "content": "Bạn là gia sư AI giỏi giải thích khái niệm phức tạp thành ngôn ngữ đơn giản.",
        },
        {"role": "user", "content": content},
    ]
    return await _chat_completion(messages, temperature=0.4)


async def grade_answer(question: str, options: list[str], correct_index: int, selected_index: int) -> str:
    """Generate feedback explaining why the answer is right or wrong."""
    correct_opt = options[correct_index]
    selected_opt = options[selected_index]
    is_correct = correct_index == selected_index

    messages = [
        {
            "role": "system",
            "content": "Bạn là giáo viên chấm bài và giải thích đáp án ngắn gọn bằng tiếng Việt.",
        },
        {
            "role": "user",
            "content": (
                f"Câu hỏi: {question}\n"
                f"Đáp án đúng: {correct_opt}\n"
                f"Học sinh chọn: {selected_opt}\n"
                f"Kết quả: {'Đúng' if is_correct else 'Sai'}\n\n"
                "Hãy giải thích ngắn gọn tại sao đáp án đó đúng/sai."
            ),
        },
    ]
    return await _chat_completion(messages, temperature=0.3)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _parse_quiz_json(raw: str, expected: int) -> list[dict]:
    """Parse and validate quiz JSON from AI response."""
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(cleaned)
        questions = data.get("questions", [])
        if not isinstance(questions, list):
            raise ValueError("questions must be a list")
        return questions[:expected]
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse quiz JSON: %s\nRaw: %s", exc, raw[:300])
        raise AppException(502, "AI returned invalid quiz format. Please try again.")
