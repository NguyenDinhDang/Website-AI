"""
Simple text chunker for feeding long documents to the AI.
Splits by paragraphs first, then merges up to chunk_size chars.
"""

from typing import Generator


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks suitable for LLM context."""
    if not text:
        return []

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        # If single paragraph is already too big, hard-split it
        if len(para) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(para), chunk_size - overlap):
                chunks.append(para[i : i + chunk_size])
            continue

        if len(current) + len(para) + 2 > chunk_size:
            chunks.append(current.strip())
            # keep tail for overlap
            current = current[-overlap:] + "\n\n" + para if overlap else para
        else:
            current = (current + "\n\n" + para).strip()

    if current:
        chunks.append(current.strip())

    return chunks


def truncate(text: str, max_chars: int = 8000) -> str:
    """Hard truncate with ellipsis marker."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[...text truncated...]"
