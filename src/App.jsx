
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);

  async function loadDocuments() {
    try {
      const response = await fetch(`${API_URL}/documents`);
      if (!response.ok) throw new Error("Could not load documents.");

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch {
      setError(
        "Cannot connect to FastAPI. Check that your backend is running."
      );
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!file) {
      setError("Please select a TXT or PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Document upload failed.");
      }

      setNotice(
        `${data.filename} uploaded successfully. ${data.chunks_created} chunks created.`
      );
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Something went wrong during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(event) {
    event.preventDefault();

    const currentQuestion = question.trim();

    if (!currentQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (documents.length === 0) {
      setError("Upload a document before asking a question.");
      return;
    }

    setError("");
    setNotice("");
    setQuestion("");
    setAsking(true);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: currentQuestion },
    ]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not get an answer.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          chunks: data.retrieved_chunks || [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to connect to the chatbot.");
    } finally {
      setAsking(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
    setNotice("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="RAG Chat home">
          <span className="brand-icon">R</span>
          <span>DocuMind</span>
        </a>

        <div className="connection-status">
          <span className="status-dot" />
          RAG Assistant
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">YOUR KNOWLEDGE BASE</p>
              <h2>Documents</h2>
            </div>
            <span className="count">{documents.length}</span>
          </div>

          <form className="upload-card" onSubmit={handleUpload}>
            <div className="upload-icon">↑</div>
            <h3>Add a document</h3>
            <p>Upload a TXT or PDF file to teach your assistant.</p>

            <label className="file-picker">
              <span>{file ? file.name : "Choose a file"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,application/pdf,text/plain"
                onChange={(event) =>
                  setFile(event.target.files?.[0] || null)
                }
              />
            </label>

            {file && (
              <p className="selected-file">
                Selected: {file.name}
              </p>
            )}

            <button
              className="primary-button upload-button"
              type="submit"
              disabled={uploading}
            >
              {uploading ? "Processing document..." : "Upload document"}
            </button>

            <p className="file-hint">Maximum size: 10 MB</p>
          </form>

          <div className="document-list">
            <h3>Uploaded files</h3>

            {documents.length === 0 ? (
              <div className="empty-documents">
                <span>▤</span>
                <p>No documents yet</p>
                <small>Your files will appear here.</small>
              </div>
            ) : (
              documents.map((doc) => (
                <div className="document-item" key={doc.filename}>
                  <span className="document-icon">
                    {doc.filename.toLowerCase().endsWith(".pdf")
                      ? "PDF"
                      : "TXT"}
                  </span>
                  <div className="document-info">
                    <p title={doc.filename}>{doc.filename}</p>
                    <small>{doc.chunks} text chunks</small>
                  </div>
                  <span className="document-check">✓</span>
                </div>
              ))
            )}

            <button
              className="refresh-button"
              type="button"
              onClick={loadDocuments}
            >
              ↻ Refresh documents
            </button>
          </div>

          <div className="sidebar-note">
            <span>✦</span>
            <p>
              Your assistant uses document context to help answer your
              questions.
            </p>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div className="assistant-avatar">✦</div>
            <div>
              <h1>Document Assistant</h1>
              <p>Ask questions about your uploaded documents</p>
            </div>
            <button
              className="clear-button"
              type="button"
              onClick={clearChat}
              disabled={messages.length === 0 || asking}
            >
              Clear chat
            </button>
          </div>

          <div className="chat-body">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon">✦</div>
                <p className="eyebrow">YOUR AI RESEARCH PARTNER</p>
                <h2>What would you like to know?</h2>
                <p className="welcome-description">
                  Upload a document, ask a question, and get an answer
                  based on the information retrieved from your files.
                </p>

                <div className="suggestion-grid">
                  {[
                    "Summarize this document",
                    "What are the key points?",
                    "Explain the main concepts",
                    "What are the important facts?",
                  ].map((suggestion) => (
                    <button
                      className="suggestion"
                      key={suggestion}
                      type="button"
                      onClick={() => setQuestion(suggestion)}
                    >
                      <span>↗</span>
                      {suggestion}
                    </button>
                  ))}
                </div>

                {documents.length === 0 && (
                  <p className="upload-reminder">
                    ↑ Start by uploading a TXT or PDF file.
                  </p>
                )}
              </div>
            ) : (
              <div className="messages">
                {messages.map((message, index) => (
                  <article
                    className={`message ${message.role}`}
                    key={`${message.role}-${index}`}
                  >
                    <div className="message-avatar">
                      {message.role === "user" ? "You" : "✦"}
                    </div>

                    <div className="message-content">
                      <p className="message-label">
                        {message.role === "user" ? "You" : "DocuMind"}
                      </p>
                      <div className="message-text">
                        {message.content}
                      </div>

                      {message.sources?.length > 0 && (
                        <div className="source-section">
                          <h4>Sources used</h4>
                          {message.sources.map((source) => (
                            <span className="source-chip" key={source}>
                              ▤ {source}
                            </span>
                          ))}

                          {message.chunks?.length > 0 && (
                            <details className="retrieved-details">
                              <summary>
                                View retrieved text and similarity scores
                              </summary>
                              {message.chunks.map((chunk, chunkIndex) => (
                                <div
                                  className="retrieved-chunk"
                                  key={`${chunk.source}-${chunkIndex}`}
                                >
                                  <div className="chunk-meta">
                                    <strong>{chunk.source}</strong>
                                    <span>
                                      Similarity: {chunk.similarity}
                                    </span>
                                  </div>
                                  <p>{chunk.text}</p>
                                </div>
                              ))}
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}

                {asking && (
                  <div className="thinking">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span>Searching documents and generating an answer...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {(error || notice) && (
            <div
              className={`feedback ${error ? "error-feedback" : "success-feedback"}`}
              role="status"
            >
              <span>{error ? "!" : "✓"}</span>
              <p>{error || notice}</p>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                ×
              </button>
            </div>
          )}

          <form className="composer" onSubmit={handleAsk}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }}
              placeholder="Ask a question about your documents..."
              rows={2}
              maxLength={4000}
              aria-label="Your question"
              disabled={asking}
            />

            <div className="composer-footer">
              <span>Answers are based on retrieved document context.</span>
              <button
                className="primary-button send-button"
                type="submit"
                disabled={asking || !question.trim()}
              >
                {asking ? "Thinking..." : "Ask AI  ↑"}
              </button>
            </div>
          </form>

          <p className="disclaimer">
            AI can make mistakes. Verify important information against your
            original documents.
          </p>
        </section>
      </main>
    </div>
  );
}
