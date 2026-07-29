from google import genai
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a helpful assistant answering questions using ONLY the provided document excerpts.
If the answer isn't in the excerpts, say you don't know — do not make up information.
You may refer back to earlier parts of the conversation to understand follow-up questions (e.g. "explain that simpler"), but your factual answers must still come only from the document excerpts.
Be concise and clear."""

REFORMULATE_PROMPT = """Given the conversation history and a follow-up question, rewrite the follow-up question as a standalone question that captures what the user actually wants to know, using context from the history.
If the follow-up question is already standalone (doesn't depend on prior context), just return it unchanged.
Return ONLY the rewritten question, nothing else — no explanation, no quotes.

Conversation history:
{history}

Follow-up question: {question}

Standalone question:"""


def reformulate_query(question: str, history: list[dict]) -> str:
    if not history:
        return question

    history_lines = [f"{msg['role'].capitalize()}: {msg['content']}" for msg in history]
    history_text = "\n".join(history_lines)

    prompt = REFORMULATE_PROMPT.format(history=history_text, question=question)

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )
        rewritten = response.text.strip()
        return rewritten if rewritten else question
    except Exception:
        # If reformulation fails for any reason, fall back to the original question
        return question


def generate_answer(question: str, chunks: list[dict], history: list[dict] = None) -> str:
    context = "\n\n".join(
        f"[Excerpt {i+1}, page {c['page']}]: {c['text']}"
        for i, c in enumerate(chunks)
    )

    history_text = ""
    if history:
        history_lines = [f"{msg['role'].capitalize()}: {msg['content']}" for msg in history]
        history_text = "Conversation so far:\n" + "\n".join(history_lines) + "\n\n"

    prompt = f"{SYSTEM_PROMPT}\n\n{history_text}Document excerpts:\n{context}\n\nQuestion: {question}"

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    return response.text


def generate_answer_stream(question: str, chunks: list[dict], history: list[dict] = None):
    context = "\n\n".join(
        f"[Excerpt {i+1}, page {c['page']}]: {c['text']}"
        for i, c in enumerate(chunks)
    )

    history_text = ""
    if history:
        history_lines = [f"{msg['role'].capitalize()}: {msg['content']}" for msg in history]
        history_text = "Conversation so far:\n" + "\n".join(history_lines) + "\n\n"

    prompt = f"{SYSTEM_PROMPT}\n\n{history_text}Document excerpts:\n{context}\n\nQuestion: {question}"

    stream = client.models.generate_content_stream(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    for chunk in stream:
        if chunk.text:
            yield chunk.text