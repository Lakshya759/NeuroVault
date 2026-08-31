// AskPage.jsx — Premium AI chat interface for NeuroVault

import { useState, useEffect, useRef } from "react";
import {
  createConversation,
  sendMessage,
  getAllConversations,
  getConversation,
} from "../api";
import ChatMessage from "../components/ChatMessage";
import Spinner from "../components/Spinner";

// ── New Chat Modal ────────────────────────────────────────────────────────────
function NewChatModal({ onConfirm, onCancel }) {
  const [title, setTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input shortly after mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim() || "New Chat";
    onConfirm(t);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-xl)",
          padding: "28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2)",
          backdropFilter: "blur(20px)",
          animation: "slide-in 0.25s ease",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
          ✨ New Conversation
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 22 }}>
          Give this conversation a name to find it easily later.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label htmlFor="new-chat-title">Conversation title</label>
            <input
              id="new-chat-title"
              ref={inputRef}
              type="text"
              placeholder="e.g. Machine Learning concepts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="row">
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <span>Start chatting →</span>
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onCancel}
              title="Cancel"
              style={{ width: 42, height: 42, fontSize: "1.1rem" }}
            >
              ✕
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AskPage ───────────────────────────────────────────────────────────────────
export default function AskPage() {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [initError, setInitError] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const threadRef = useRef(null);
  const inputRef = useRef(null);

  // ── Initialize ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        let pastConvos = [];
        try {
          const data = await getAllConversations();
          if (data.data && data.data.length > 0) pastConvos = data.data;
        } catch (err) {
          if (
            !err.message.includes("404") &&
            !err.message.toLowerCase().includes("no converation found")
          ) {
            throw err;
          }
        }

        if (pastConvos.length > 0) {
          setConversations(pastConvos);
          const latest = pastConvos[pastConvos.length - 1];
          await loadConversation(latest.id);
        } else {
          // Show modal for first conversation
          setInitLoading(false);
          setShowNewChatModal(true);
          return;
        }
      } catch (err) {
        setInitError(err.message || "Could not load or start chat sessions.");
      } finally {
        setInitLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConversation(id) {
    setLoadingThread(true);
    setConversationId(id);
    setSendError("");
    try {
      const data = await getConversation(id);
      const turns = data.data.conversationTurns || [];
      const loadedMessages = [];
      turns.forEach((turn) => {
        if (turn.question)
          loadedMessages.push({ id: `u-${turn.id}`, role: "user", text: turn.question });
        if (turn.answer)
          loadedMessages.push({ id: `a-${turn.id}`, role: "ai", text: turn.answer });
      });
      setMessages(loadedMessages);
    } catch (err) {
      setSendError(err.message || "Failed to load thread.");
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleCreateConversation(title) {
    setShowNewChatModal(false);
    setInitLoading(true);
    try {
      const data = await createConversation(title);
      const newConvo = data.data;
      setConversations((prev) => [...prev, newConvo]);
      setConversationId(newConvo.id);
      setMessages([]);
      setSendError("");
    } catch (err) {
      setSendError(err.message || "Failed to create new conversation.");
    } finally {
      setInitLoading(false);
    }
  }

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend() {
    const question = input.trim();
    if (!question || sending || !conversationId) return;

    setSendError("");
    setInput("");

    const userMsg = { id: `u-${Date.now()}`, role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);

    const thinkingId = `thinking-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "ai", text: "", isThinking: true },
    ]);

    setSending(true);
    try {
      const data = await sendMessage(conversationId, question);
      const turn = data.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { id: turn.id || thinkingId, role: "ai", text: turn.answer, isThinking: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      setSendError(err.message || "Failed to get a response. Please try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Get active convo title ────────────────────────────────────────────────
  const activeConvo = conversations.find((c) => c.id === conversationId);

  // ── Render ────────────────────────────────────────────────────────────────
  if (initLoading && conversations.length === 0) {
    return (
      <div className="page-chat" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 16 }}>✨</div>
          <Spinner size="lg" />
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 16 }}>
            Loading your conversations…
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="page-chat" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="error-box" style={{ maxWidth: 400 }}>
          ⚠️ {initError}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onConfirm={handleCreateConversation}
          onCancel={() => {
            if (conversations.length > 0) setShowNewChatModal(false);
          }}
        />
      )}

      <div className="page-chat">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <button
              className="btn btn-primary btn-full"
              onClick={() => setShowNewChatModal(true)}
              disabled={sending || initLoading}
              id="new-chat-btn"
            >
              <span>✏️ New Chat</span>
            </button>
          </div>

          <div className="chat-sidebar-list">
            <p className="chat-sidebar-label">Recent</p>
            {conversations
              .slice()
              .reverse()
              .map((convo) => (
                <div
                  key={convo.id}
                  className={`chat-convo-item${convo.id === conversationId ? " active" : ""}${sending ? " disabled" : ""}`}
                  onClick={() => {
                    if (!sending && convo.id !== conversationId) {
                      loadConversation(convo.id);
                    }
                  }}
                  title={convo.title}
                >
                  {convo.title || `Chat ${convo.id}`}
                </div>
              ))}
          </div>
        </div>

        {/* ── Main Chat Area ───────────────────────────────────────────────── */}
        <div className="chat-main">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <p className="chat-header-title">
                <span className="chat-header-title-dot" />
                {activeConvo ? activeConvo.title : "Ask AI"}
              </p>
              <p className="chat-header-subtitle">
                Searches your vault first · Falls back to general knowledge
              </p>
            </div>

            {initLoading && (
              <Spinner size="sm" />
            )}
          </div>

          {/* Thread */}
          <div className="chat-thread" ref={threadRef} id="chat-thread">
            {loadingThread ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="chat-empty">
                    <div className="chat-empty-icon">✨</div>
                    <p className="chat-empty-title">Ask anything</p>
                    <p className="chat-empty-text">
                      I'll search your notes vault first, then answer from
                      general knowledge if needed.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    text={msg.text}
                    isThinking={msg.isThinking || false}
                  />
                ))}
              </>
            )}
          </div>

          {/* Error */}
          {sendError && (
            <div style={{ padding: "0 28px 8px" }}>
              <div className="error-box" role="alert">
                ⚠️ {sendError}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-bar">
              <textarea
                id="chat-input"
                ref={inputRef}
                className="chat-input"
                placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || loadingThread}
                rows={1}
              />
              <button
                id="chat-send"
                className="chat-send-btn"
                onClick={handleSend}
                disabled={sending || loadingThread || !input.trim()}
                aria-label="Send message"
              >
                {sending ? <Spinner size="sm" /> : "↑"}
              </button>
            </div>
            <p className="chat-input-hint">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
