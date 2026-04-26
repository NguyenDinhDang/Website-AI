"""
AI Service — single entry point for all LLM calls.
Wraps Google Gemini API with retry logic và structured prompt builders.
Never called directly from routers — always via feature services.
"""

import asyncio
import logging
import json

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded, GoogleAPIError

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

_gemini_model: genai.GenerativeModel | None = None


def get_gemini_model() -> genai.GenerativeModel:
    global _gemini_model
    if _gemini_model is None:
        if not settings.GEMINI_API_KEY:
            raise AppException(500, "GEMINI_API_KEY chưa được cấu hình trong file .env")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL_NAME)
    return _gemini_model


# ── Low-level call với retry ──────────────────────────────────────────────────

async def _generate_content(prompt: str, temperature: float = 0.7) -> str:
    """
    Gọi Gemini generateContent với exponential-backoff retry.
    Chạy trong thread pool vì SDK của Google là synchronous.
    """
    gemini_model = get_gemini_model()
    generation_config = genai.types.GenerationConfig(temperature=temperature)
    last_exception: Exception | None = None

    for attempt_number in range(1, settings.AI_MAX_RETRIES + 1):
        try:
            # Gemini SDK là sync → chạy trong executor để không block event loop
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: gemini_model.generate_content(
                    prompt,
                    generation_config=generation_config,
                )
            )
            return response.text or ""

        except ResourceExhausted as quota_exceeded_error:
            wait_seconds = settings.AI_RETRY_DELAY * (2 ** (attempt_number - 1))
            logger.warning(
                "Gemini quota exceeded (attempt %d/%d) — retrying in %.1fs",
                attempt_number, settings.AI_MAX_RETRIES, wait_seconds,
            )
            last_exception = quota_exceeded_error
            await asyncio.sleep(wait_seconds)

        except DeadlineExceeded as timeout_error:
            logger.warning(
                "Gemini timeout (attempt %d/%d)",
                attempt_number, settings.AI_MAX_RETRIES,
            )
            last_exception = timeout_error
            await asyncio.sleep(settings.AI_RETRY_DELAY)

        except GoogleAPIError as google_api_error:
            logger.error("Gemini API error: %s", google_api_error)
            raise AppException(502, f"AI service error: {str(google_api_error)}")

    raise AppException(
        503,
        f"AI service unavailable after {settings.AI_MAX_RETRIES} retries: {last_exception}"
    )


# ── High-level AI operations ──────────────────────────────────────────────────

async def summarize(document_text: str) -> str:
    """Tóm tắt tài liệu thành bullet points bằng tiếng Việt."""
    prompt = (
        "Bạn là trợ lý học tập thông minh.\n"
        "Hãy tóm tắt tài liệu bên dưới bằng tiếng Việt, "
        "sử dụng bullet points rõ ràng, ngắn gọn.\n\n"
        f"Tài liệu:\n{document_text}"
    )
    return await _generate_content(prompt, temperature=0.3)


async def generate_quiz(document_text: str, num_questions: int = 5) -> list[dict]:
    """
    Sinh câu hỏi trắc nghiệm từ nội dung tài liệu.
    Trả về list[dict] với keys: question, options, correct_index, explanation.
    """
    prompt = (
        "Bạn là giáo viên chuyên tạo bài kiểm tra trắc nghiệm.\n"
        "Luôn trả về ĐÚNG định dạng JSON sau, không thêm text ngoài:\n"
        '{"questions": [{"question": "...", "options": ["A","B","C","D"], '
        '"correct_index": 0, "explanation": "..."}]}\n\n'
        f"Tạo {num_questions} câu hỏi trắc nghiệm 4 đáp án "
        f"từ nội dung sau (bằng tiếng Việt):\n\n{document_text}"
    )
    raw_response_text = await _generate_content(prompt, temperature=0.6)
    return _parse_quiz_json(raw_response_text, num_questions)


async def chat_qa(user_question: str, document_context: str = "") -> str:
    """Trả lời câu hỏi của học sinh, có thể kèm context từ tài liệu."""
    if document_context:
        prompt = (
            "Bạn là trợ lý học tập AI. Trả lời câu hỏi của sinh viên "
            "một cách rõ ràng, chính xác bằng tiếng Việt.\n\n"
            f"Dựa vào tài liệu sau:\n{document_context}\n\n"
            f"Câu hỏi: {user_question}"
        )
    else:
        prompt = (
            "Bạn là trợ lý học tập AI. Trả lời câu hỏi của sinh viên "
            "một cách rõ ràng, chính xác bằng tiếng Việt.\n\n"
            f"Câu hỏi: {user_question}"
        )
    return await _generate_content(prompt, temperature=0.5)


async def explain(passage_text: str, document_context: str = "") -> str:
    """Giải thích một đoạn văn bản theo ngôn ngữ đơn giản."""
    context_section = f"Ngữ cảnh tài liệu:\n{document_context}\n\n" if document_context else ""
    prompt = (
        "Bạn là gia sư AI giỏi giải thích khái niệm phức tạp thành ngôn ngữ đơn giản.\n\n"
        f"{context_section}"
        "Hãy giải thích đoạn nội dung sau một cách đơn giản, dễ hiểu bằng tiếng Việt:\n\n"
        f"{passage_text}"
    )
    return await _generate_content(prompt, temperature=0.4)


async def grade_answer(
    quiz_question: str,
    answer_options: list[str],
    correct_answer_index: int,
    selected_answer_index: int,
) -> str:
    """Chấm bài và giải thích tại sao đáp án đúng/sai."""
    correct_option_text = answer_options[correct_answer_index]
    selected_option_text = answer_options[selected_answer_index]
    is_correct = correct_answer_index == selected_answer_index

    prompt = (
        "Bạn là giáo viên chấm bài và giải thích đáp án ngắn gọn bằng tiếng Việt.\n\n"
        f"Câu hỏi: {quiz_question}\n"
        f"Đáp án đúng: {correct_option_text}\n"
        f"Học sinh chọn: {selected_option_text}\n"
        f"Kết quả: {'Đúng' if is_correct else 'Sai'}\n\n"
        "Hãy giải thích ngắn gọn tại sao đáp án đó đúng/sai."
    )
    return await _generate_content(prompt, temperature=0.3)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _parse_quiz_json(raw_response_text: str, expected_question_count: int) -> list[dict]:
    """Parse và validate JSON quiz từ response của Gemini."""
    try:
        cleaned_text = (
            raw_response_text.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )
        parsed_data = json.loads(cleaned_text)
        question_list = parsed_data.get("questions", [])
        if not isinstance(question_list, list):
            raise ValueError("'questions' phải là một list")
        return question_list[:expected_question_count]

    except (json.JSONDecodeError, ValueError) as parse_error:
        logger.error(
            "Failed to parse quiz JSON: %s\nRaw response: %s",
            parse_error,
            raw_response_text[:300],
        )
        raise AppException(502, "AI trả về định dạng quiz không hợp lệ. Vui lòng thử lại.")