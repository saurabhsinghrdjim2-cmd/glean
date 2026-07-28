import chromadb
from app.config import settings

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

def get_collection(document_id: str):
    return chroma_client.get_or_create_collection(name=f"doc_{document_id}")

def store_chunks(document_id: str, chunks: list[dict], embeddings: list[list[float]]):
    collection = get_collection(document_id)
    collection.add(
        ids=[f"{document_id}_{i}" for i in range(len(chunks))],
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[{"page": c["page"], "document_id": document_id} for c in chunks]
    )

def query_chunks(document_id: str, query_embedding: list[float], top_k: int = 4):
    collection = get_collection(document_id)
    return collection.query(query_embeddings=[query_embedding], n_results=top_k)