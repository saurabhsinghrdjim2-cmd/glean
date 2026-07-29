import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { listDocuments, uploadDocument } from "../api/documents";
import useAuthStore from "../store/authStore";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const fetchDocuments = async () => {
    try {
      const response = await listDocuments();
      setDocuments(response.data);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      await uploadDocument(file, setUploadProgress);
      await fetchDocuments();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const statusStyles = {
    ready: "bg-green-50 text-green-700 border-green-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest uppercase text-ink font-medium">
            Glean
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-text-muted hover:text-ink transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl mb-1">Your documents</h1>
        <p className="text-text-muted mb-8">
          Upload a PDF, then ask it anything.
        </p>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition mb-10 ${
            isDragActive
              ? "border-ink bg-ink/5"
              : "border-border bg-white hover:border-ink/40"
          } ${uploading ? "cursor-not-allowed opacity-70" : ""}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <p className="font-medium mb-2">Uploading and processing...</p>
              <div className="w-full max-w-xs mx-auto bg-paper-dim rounded-full h-2 overflow-hidden">
                <div
                  className="bg-highlight h-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="font-medium mb-1">
                {isDragActive ? "Drop your PDF here" : "Drag & drop a PDF, or click to browse"}
              </p>
              <p className="text-sm text-text-muted">PDF files only</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-6">
            {error}
          </p>
        )}

        {/* Document list */}
        {loadingDocs ? (
          <p className="text-text-muted">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-xl bg-white">
            <p className="text-text-muted">
              No documents yet. Upload one above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => doc.status === "ready" && navigate(`/chat/${doc.id}`)}
                disabled={doc.status !== "ready"}
                className={`w-full text-left flex items-center justify-between bg-white border border-border rounded-xl px-5 py-4 transition ${
                  doc.status === "ready"
                    ? "hover:border-ink/40 cursor-pointer"
                    : "cursor-not-allowed opacity-70"
                }`}
              >
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-sm text-text-muted font-mono">
                    {doc.chunk_count} chunks
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyles[doc.status] || ""}`}
                >
                  {doc.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}