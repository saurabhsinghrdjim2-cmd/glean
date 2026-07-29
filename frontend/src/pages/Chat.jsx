import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { chatWithDocumentStream } from "../api/documents";

export default function Chat() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openSources, setOpenSources] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: "", sources: [] },
    ]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      await chatWithDocumentStream(
        documentId,
        q,
        history,
        (sources) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              sources,
            };
            return updated;
          });
        },
        (tokenText) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + tokenText,
            };
            return updated;
          });
        }
      );
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return;
      }
      setError(
        !err.status
          ? "Can't reach the server. Check your connection and try again."
          : err.message || "Something went wrong. Please try again."
      );
      setMessages((prev) => prev.slice(0, -2));
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (index) => {
    setOpenSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-text-muted hover:text-ink transition flex items-center gap-1.5"
          >
            ← Back to documents
          </button>
          <span className="font-mono text-xs tracking-widest uppercase text-ink font-medium">
            Glean
          </span>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <h2 className="font-display text-2xl mb-2">Ask this document anything</h2>
              <p className="text-text-muted">
                Answers are grounded in the document's actual content, with page citations.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-ink text-paper rounded-2xl rounded-br-sm px-5 py-3 max-w-lg">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start">
                  <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-5 py-4 max-w-xl min-w-[120px]">
                    {msg.content ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      loading &&
                      i === messages.length - 1 && (
                        <span className="text-text-muted text-sm">Thinking...</span>
                      )
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => toggleSources(i)}
                          className="text-xs font-mono text-text-muted hover:text-ink transition flex items-center gap-1.5"
                        >
                          <span className="inline-block w-2 h-2 bg-highlight rounded-full" />
                          {openSources[i] ? "Hide" : "Show"} {msg.sources.length} source
                          {msg.sources.length > 1 ? "s" : ""}
                        </button>

                        {openSources[i] && (
                          <div className="mt-3 space-y-2">
                            {msg.sources.map((source, si) => (
                              <div
                                key={si}
                                className="bg-paper-dim rounded-lg px-3 py-2 text-xs"
                              >
                                <span className="font-mono text-text-muted">
                                  Page {source.page}
                                </span>
                                <p className="text-text-muted mt-1 line-clamp-3">
                                  {source.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this document..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="bg-ink text-paper font-medium px-6 py-2.5 rounded-lg hover:bg-ink-light transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}