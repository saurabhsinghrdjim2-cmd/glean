from google import genai
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a helpful assistant answering questions using ONLY the provided document excerpts.
If the answer isn't in the excerpts, say you don't know — do not make up information.
Be concise and clear."""


def generate_answer(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[Excerpt {i+1}, page {c['page']}]: {c['text']}"
        for i, c in enumerate(chunks)
    )

    prompt = f"{SYSTEM_PROMPT}\n\nDocument excerpts:\n{context}\n\nQuestion: {question}"

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    return response.text