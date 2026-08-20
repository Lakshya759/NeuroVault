// ChatMessage.jsx — renders a single message bubble
// Props:
//   role: "user" | "ai"
//   text: string — message text (Markdown for AI, plain text for user)
//   isThinking: boolean — show the animated dots instead of text (loading state)

import MarkdownMessage from "./MarkdownMessage";

// The backend embeds this prefix in the answer when it answered from general knowledge:
const GENERAL_PREFIX = "⚠️ I couldn't find any relevant notes";

// Determine source from the answer text when the backend doesn't send a separate field
export function detectSource(text) {
  if (!text) return "notes";
  return text.startsWith(GENERAL_PREFIX) ? "general" : "notes";
}

export default function ChatMessage({ role, text, isThinking = false }) {
  const source = role === "ai" ? detectSource(text) : null;

  return (
    <div className={`chat-message ${role}`}>
      <div className="chat-bubble">
        {isThinking ? (
          // Animated loading dots while waiting for the AI response
          <div className="thinking-dots" aria-label="AI is thinking">
            <span /><span /><span />
          </div>
        ) : role === "ai" ? (
          // AI messages: render as formatted Markdown
          <MarkdownMessage text={text} />
        ) : (
          // User messages: plain text (they typed it, no Markdown needed)
          text
        )}
      </div>

      {/* Source badge — only for AI messages that have text */}
      {role === "ai" && !isThinking && (
        <span className={`chat-badge ${source === "notes" ? "from-notes" : "not-in-notes"}`}>
          {source === "notes" ? (
            <> 📚 From your notes </>
          ) : (
            <> ✏️ Not in your notes yet — consider adding it! </>
          )}
        </span>
      )}
    </div>
  );
}
