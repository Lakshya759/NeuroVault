// AskPage.jsx — Chat interface backed by the conversation API
//
// Flow:
//   1. On mount, fetch past conversations. If none exist, create one.
//   2. User types a question → POST /chat/conversations/:id/message
//   3. The AI response is added to the thread with a source badge

import { useState, useEffect, useRef } from "react";
import { createConversation, sendMessage, getAllConversations, getConversation } from "../api";
import ChatMessage from "../components/ChatMessage";
import Spinner from "../components/Spinner";

export default function AskPage() {
  // ── Conversation state ─────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [initError, setInitError] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // ── Thread state ───────────────────────────────────────────────────────────
  // Each message: { id, role: "user"|"ai", text: string, isThinking?: boolean }
  const [messages, setMessages] = useState([]);

  // ── Input state ────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const threadRef = useRef(null); // scroll container
  const inputRef = useRef(null);  // textarea

  // ── Initialize on mount ───────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        let pastConvos = [];
        try {
          const data = await getAllConversations();
          if (data.data && data.data.length > 0) {
            pastConvos = data.data;
          }
        } catch (err) {
          // If 404 No Conversation Found, we ignore and create new.
          if (!err.message.includes("404") && !err.message.toLowerCase().includes("no converation found")) {
            throw err;
          }
        }

        if (pastConvos.length > 0) {
          setConversations(pastConvos);
          // Load the latest conversation
          const latest = pastConvos[pastConvos.length - 1];
          await loadConversation(latest.id);
        } else {
          // No past conversations, create first one
          let title = window.prompt("Enter a title for your first conversation:");
          if (!title || !title.trim()) title = "New Chat";
          const data = await createConversation(title);
          const newConvo = data.data;
          setConversations([newConvo]);
          setConversationId(newConvo.id);
          setMessages([]);
        }
      } catch (err) {
        setInitError(err.message || "Could not load or start chat sessions.");
      } finally {
        setInitLoading(false);
      }
    }
    init();
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
        if (turn.question) {
          loadedMessages.push({ id: `u-${turn.id}`, role: "user", text: turn.question });
        }
        if (turn.answer) {
          loadedMessages.push({ id: `a-${turn.id}`, role: "ai", text: turn.answer });
        }
      });
      setMessages(loadedMessages);
    } catch (err) {
      setSendError(err.message || "Failed to load thread.");
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleNewConversation() {
    if (sending) return;
    
    let title = window.prompt("Enter a title for the new conversation:");
    if (!title || !title.trim()) return;

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

  // ── Auto-scroll to bottom when messages change ─────────────────────────────
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    const question = input.trim();
    if (!question || sending || !conversationId) return;

    setSendError("");
    setInput("");

    // Append user message immediately for responsiveness
    const userMsg = { id: `u-${Date.now()}`, role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);

    // Show a "thinking" bubble while waiting
    const thinkingId = `thinking-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "ai", text: "", isThinking: true },
    ]);

    setSending(true);
    try {
      const data = await sendMessage(conversationId, question);
      const turn = data.data; // { question, answer, ... }

      // Replace the thinking bubble with the real answer
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { id: turn.id || thinkingId, role: "ai", text: turn.answer, isThinking: false }
            : m
        )
      );
    } catch (err) {
      // Remove the thinking bubble and show an error
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      setSendError(err.message || "Failed to get a response. Please try again.");
    } finally {
      setSending(false);
      // Return focus to the input
      inputRef.current?.focus();
    }
  }

  // ── Handle Enter key (send) vs Shift+Enter (newline) ──────────────────────
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (initLoading && conversations.length === 0) {
    return (
      <div className="page-chat">
        <Spinner center />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="page-chat" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="error-box" role="alert" style={{ maxWidth: 400 }}>
          {initError}
        </div>
      </div>
    );
  }

  return (
    <div className="page-chat" style={{ flexDirection: "row", maxWidth: 1000, padding: 0 }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 260,
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-surface)",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <button 
            className="btn btn-primary btn-full" 
            onClick={handleNewConversation}
            disabled={sending || initLoading}
          >
            + New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {conversations.slice().reverse().map(convo => (
            <div
              key={convo.id}
              onClick={() => {
                if (!sending && convo.id !== conversationId) {
                  loadConversation(convo.id);
                }
              }}
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: sending ? "not-allowed" : "pointer",
                backgroundColor: convo.id === conversationId ? "var(--color-accent-soft)" : "transparent",
                color: convo.id === conversationId ? "var(--color-accent-dark)" : "var(--color-text)",
                fontWeight: convo.id === conversationId ? 600 : 500,
                fontSize: "0.9rem",
                marginBottom: "4px",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => {
                if (convo.id !== conversationId && !sending) e.currentTarget.style.backgroundColor = "var(--color-bg)";
              }}
              onMouseLeave={(e) => {
                if (convo.id !== conversationId && !sending) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {convo.title || `Chat ${convo.id}`}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px", position: "relative" }}>
        
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="chat-header">
          <div>
            <p className="chat-header-title">🤖 Ask anything</p>
            <p className="chat-header-subtitle">
              I'll search your notes first, then fall back to general knowledge.
            </p>
          </div>
        </div>

        {/* ── Thread ──────────────────────────────────────────────────────── */}
        <div className="chat-thread" ref={threadRef} id="chat-thread">
          {loadingThread ? (
            <Spinner center />
          ) : (
            <>
              {messages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <p className="chat-empty-text">
                    Ask a question — your notes will be searched first.
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

        {/* ── Send error ──────────────────────────────────────────────────── */}
        {sendError && (
          <div className="error-box" role="alert" style={{ marginBottom: 8 }}>
            {sendError}
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────────────────── */}
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
      </div>
    </div>
  );
}
