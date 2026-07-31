import client, { API_URL } from "./client";

export const listDocuments = () => client.get("/documents/");

export const uploadDocument = (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return client.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    },
  });
};

export const chatWithDocument = (documentId, question, history = []) =>
  client.post(`/documents/${documentId}/chat`, { question, history });

export const chatWithDocumentStream = async (documentId, question, history, onSources, onToken) => {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_URL}/documents/${documentId}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.detail || "Request failed");
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sourcesExtracted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    if (!sourcesExtracted) {
      const endMarker = "@@ENDSOURCES@@";
      const endIndex = buffer.indexOf(endMarker);
      if (endIndex !== -1) {
        const sourcesJson = buffer.slice("@@SOURCES@@".length, endIndex);
        const sources = JSON.parse(sourcesJson);
        onSources(sources);
        buffer = buffer.slice(endIndex + endMarker.length);
        sourcesExtracted = true;
        if (buffer) {
          onToken(buffer);
          buffer = "";
        }
      }
    } else {
      onToken(buffer);
      buffer = "";
    }
  }
};
export const getMessages = (documentId) => client.get(`/documents/${documentId}/messages`);