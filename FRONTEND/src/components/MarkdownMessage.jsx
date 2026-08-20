// MarkdownMessage.jsx
// Renders AI response text as formatted Markdown.
//
// Used only for role="ai" bubbles. User messages are still plain text.
//
// Features:
//   - Full GitHub Flavored Markdown via remark-gfm (tables, strikethrough, task lists)
//   - Custom CodeBlock with: language label, copy button, horizontal scroll, monospace font
//   - All element types (headings, lists, blockquotes, hr, inline code, tables) are styled
//     via the "md-body" CSS class defined in App.css
//   - The original text is never mutated before rendering

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── CodeBlock ─────────────────────────────────────────────────────────────────
// Custom renderer for fenced code blocks (``` ... ```) and inline code.
//
// Props supplied by react-markdown's component override system:
//   inline  – true when this is an inline `code` span, false for fenced blocks
//   className – "language-js" style class set by remark when a language is given
//   children  – the code string(s)

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);

  // Extract language name from "language-javascript" → "javascript"
  const language = className ? className.replace("language-", "") : "";

  // Flatten children to a single string (react-markdown can pass an array)
  const code = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  // Inline code — render a simple <code> span
  if (inline) {
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    );
  }

  // Fenced code block
  return (
    <div className="md-code-block">
      {/* Header bar: language label + copy button */}
      <div className="md-code-header">
        <span className="md-code-lang">{language || "code"}</span>
        <button
          className={`md-code-copy${copied ? " copied" : ""}`}
          onClick={handleCopy}
          aria-label="Copy code"
          type="button"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Scrollable code area */}
      <pre className="md-code-pre">
        <code className={className} {...props}>
          {code}
        </code>
      </pre>
    </div>
  );
}

// ── MarkdownMessage ───────────────────────────────────────────────────────────
// The main export. Wraps ReactMarkdown with GFM support and the custom
// CodeBlock renderer. All output is scoped inside ".md-body" for CSS isolation.

export default function MarkdownMessage({ text }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Route both inline and block code through our custom component
          code: CodeBlock,

          // Wrap tables in a scrollable container for narrow screens
          table({ children }) {
            return (
              <div className="md-table-wrapper">
                <table className="md-table">{children}</table>
              </div>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
