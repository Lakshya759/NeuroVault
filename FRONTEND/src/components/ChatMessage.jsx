// ChatMessage.jsx — renders a single message bubble with premium styling

import MarkdownMessage from "./MarkdownMessage";

const GENERAL_PREFIX = "⚠️ I couldn't find any relevant notes";

export function detectSource(text) {
  if (!text) return "notes";
  return text.startsWith(GENERAL_PREFIX) ? "general" : "notes";
}

export default function ChatMessage({ role, text, isThinking = false }) {
  const source = role === "ai" ? detectSource(text) : null;

  return (
    <div className={`chat-message ${role}`}>
      <div className="chat-role-label">
        {role === "user" ? "You" : "NeuroVault AI"}
      </div>

      <div className="chat-bubble">
        {isThinking ? (
          <div className="thinking-dots" aria-label="AI is thinking">
            <span /><span /><span />
          </div>
        ) : role === "ai" ? (
          <MarkdownMessage text={text} />
        ) : (
          text
        )}
      </div>

      {role === "ai" && !isThinking && (
        <span className={`chat-badge ${source === "notes" ? "from-notes" : "not-in-notes"}`}>
          {source === "notes" ? (
            <> 📚 From your vault </>
          ) : (
            <> 🌐 General knowledge · consider adding to vault </>
          )}
        </span>
      )}
    </div>
  );
}
