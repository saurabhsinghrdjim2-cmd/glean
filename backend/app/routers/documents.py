import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app import models, schemas
from app.services.pdf_processor import extract_text_with_pages
from app.services.chunker import chunk_pages
from app.services.embeddings import embed_texts
from app.services.vector_store import store_chunks

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.DocumentOut)
def upload_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    new_doc = models.Document(
        owner_id=current_user.id,
        filename=file.filename,
        status="processing",
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    temp_path = os.path.join(UPLOAD_DIR, f"{new_doc.id}.pdf")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        pages = extract_text_with_pages(temp_path)
        if not pages:
            new_doc.status = "failed"
            db.commit()
            raise HTTPException(status_code=400, detail="Could not extract any text from this PDF")

        chunks = chunk_pages(pages)
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        store_chunks(new_doc.id, chunks, embeddings)

        new_doc.status = "ready"
        new_doc.chunk_count = len(chunks)
        db.commit()
        db.refresh(new_doc)

    except HTTPException:
        raise
    except Exception as e:
        new_doc.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return new_doc


@router.get("/", response_model=list[schemas.DocumentOut])
def list_documents(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Document).filter(models.Document.owner_id == current_user.id).all()
from app.services.embeddings import embed_query
from app.services.vector_store import query_chunks
from app.services.llm import generate_answer


@router.post("/{document_id}/chat", response_model=schemas.ChatResponse)
def chat_with_document(
    document_id: str,
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.owner_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail=f"Document is not ready (status: {doc.status})")

    query_embedding = embed_query(request.question)
    results = query_chunks(document_id, query_embedding, top_k=4)

    chunks = [
        {"text": text, "page": meta["page"]}
        for text, meta in zip(results["documents"][0], results["metadatas"][0])
    ]

    answer = generate_answer(request.question, chunks)

    return {"answer": answer, "sources": chunks}