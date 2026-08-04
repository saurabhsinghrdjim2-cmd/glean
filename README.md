# Glean — Chat With Your Documents

A full-stack RAG (Retrieval-Augmented Generation) application that lets users upload PDFs and ask natural-language questions, receiving answers grounded in the document's actual content with page-level citations.

**Live demo:** https://gleanchat.vercel.app
**Backend API docs:** https://rag-chat-with-docs.onrender.com/docs

> Note: the backend runs on Render's free tier and spins down after ~15 minutes of inactivity. The first request after idle time may take 30–50 seconds to wake up.

---

## What it does

1. **Upload a PDF** — the document is split into overlapping chunks, embedded using Google's Gemini embedding model, and stored in a vector database.
2. **Ask a question** — the question is embedded and matched against the document's chunks using semantic similarity search.
3. **Get a grounded answer** — the most relevant chunks are passed to Gemini along with the question, which generates an answer using *only* that content, with citations showing exactly which page each part of the answer came from.
4. **Continue the conversation** — follow-up questions are automatically reformulated into standalone queries using conversation history, so "explain that simpler" correctly re-retrieves the right context instead of searching for the literal phrase.
5. **Pick up where you left off** — all conversations are persisted per user, per document, and reload automatically.

---

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│   FastAPI    │─────▶│  PostgreSQL │
│  (Vercel)   │      │   (Render)   │      │   (Neon)    │
└─────────────┘      └──────┬───────┘      └─────────────┘
                             │
                     ┌───────┴───────┐
                     ▼               ▼
              ┌─────────────┐  ┌──────────────┐
              │  ChromaDB    │  │  Gemini API  │
              │ (vectors)    │  │ (embeddings  │
              │              │  │  + LLM)      │
              └─────────────┘  └──────────────┘
```

**Document ingestion:** PDF upload → text extraction (page-aware) → recursive chunking with overlap → Gemini embeddings → stored in ChromaDB, namespaced per document.

**Query flow:** question → (if follow-up) reformulated into a standalone query using conversation history → embedded → top-k similarity search against the document's chunks → chunks + question + history passed to Gemini with a hallucination-guarding system prompt → answer + citations returned and persisted.

---

## Tech Stack

**Backend**
- FastAPI (Python)
- PostgreSQL + SQLAlchemy + Alembic migrations
- ChromaDB (vector store)
- Google Gemini API (embeddings + generation)
- JWT authentication with bcrypt password hashing
- `slowapi` for rate limiting
- Pydantic for request validation

**Frontend**
- React + Vite
- Tailwind CSS v4 (custom design system)
- React Router
- Zustand (state management)
- Axios

**Infrastructure**
- Neon (managed Postgres)
- Render (backend hosting)
- Vercel (frontend hosting)

---

## Key Technical Decisions

- **Chunking with overlap:** documents are split into ~800-character chunks with 150-character overlap, preventing answers from losing context when relevant text straddles a chunk boundary.
- **Hallucination guardrail:** the system prompt explicitly instructs the model to say "I don't know" rather than fabricate an answer when the retrieved chunks don't contain relevant information — verified with off-topic test queries.
- **Query reformulation:** naive RAG systems only embed the literal follow-up question, which fails for context-dependent questions like "explain that simpler." This app first rewrites follow-ups into standalone questions using conversation history before running retrieval, meaningfully improving multi-turn accuracy.
- **Per-document vector namespacing:** each document's chunks are stored in an isolated ChromaDB collection, combined with a Postgres-level ownership check on every query, so users can never retrieve chunks from documents they don't own.
- **Rate limiting by identity, not just IP:** authenticated requests are rate-limited per user ID (falling back to IP for anonymous requests), which is more accurate than pure IP-based limiting on shared networks.
- **Input validation with hard limits:** passwords, questions, and conversation history all have explicit length caps enforced server-side via Pydantic, preventing both abuse (cost/DoS) and a real bug class (bcrypt's 72-byte password limit, caught and fixed).

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for local Postgres)
- A Google Gemini API key ([get one free](https://aistudio.google.com/apikey))

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
cp .env.example .env           # fill in your real values

docker compose up -d           # from project root, starts Postgres
alembic upgrade head           # create tables

uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env           # set VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

---

## Testing Notes

The following edge cases were explicitly tested during development:
- Off-topic questions correctly return "I don't know" rather than hallucinating
- XSS payloads in chat input are rendered as literal text, not executed
- Unauthenticated access to protected routes redirects to login
- Expired/invalid JWTs trigger automatic logout
- Non-PDF and oversized file uploads are rejected client- and server-side
- Documents mid-processing cannot be queried until ready
- Network failures during chat show a clear, honest error message and recover gracefully once connectivity returns

---

## Known Limitations / Future Work

- No password reset flow yet (planned)
- Free-tier hosting means the backend cold-starts after inactivity
- Streaming responses are implemented on the backend but currently deliver the full answer in one burst rather than token-by-token, due to a buffering issue between the hosting environment and the Gemini SDK that wasn't fully resolved
- Retrieval uses simple top-k similarity search; no re-ranking step yet
