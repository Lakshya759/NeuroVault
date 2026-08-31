// NoteCard.jsx — Premium expandable note card for NeuroVault
// Props:
//   note: { id, title, content, created_at }

import { useState } from "react";
import MarkdownMessage from "./MarkdownMessage";

// Format ISO date string → "Aug 19, 2026"
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Generate a subtle color accent per-card based on title (deterministic)
function getAccentIndex(str) {
  if (!str) return 0;
  return str.charCodeAt(0) % 5;
}

const CARD_ACCENTS = [
  { dot: "#a855f7", glow: "rgba(168, 85, 247, 0.15)" },
  { dot: "#06b6d4", glow: "rgba(6, 182, 212, 0.15)" },
  { dot: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" },
  { dot: "#10b981", glow: "rgba(16, 185, 129, 0.15)" },
  { dot: "#f43f5e", glow: "rgba(244, 63, 94, 0.15)" },
];

// Strip common Markdown tokens so the collapsed 2-line preview reads as clean plain text.
// e.g.  "# Heading" → "Heading",  "**bold**" → "bold",  "- item" → "item"
function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, "[code]")        // fenced code blocks → placeholder
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))  // inline code → raw text
    .replace(/^#{1,6}\s+/gm, "")                 // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2")           // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")              // italic
    .replace(/~~(.*?)~~/g, "$1")                  // strikethrough
    .replace(/!\[.*?\]\(.*?\)/g, "")              // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")      // links → label only
    .replace(/^\s*[-*+]\s+/gm, "")               // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, "")               // ordered list markers
    .replace(/^\s*>\s+/gm, "")                   // blockquotes
    .replace(/\n{2,}/g, " ")                     // collapse blank lines
    .replace(/\n/g, " ")                         // remaining newlines → space
    .trim();
}

export default function NoteCard({ note }) {
  const [expanded, setExpanded] = useState(false);
  const accent = CARD_ACCENTS[getAccentIndex(note.title)];

  return (
    <div
      className={`note-card${expanded ? " expanded" : ""}`}
      onClick={() => setExpanded((prev) => !prev)}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((prev) => !prev)}
      style={expanded ? { boxShadow: `0 8px 32px ${accent.glow}` } : {}}
    >
      <div className="note-card-header">
        {/* Colored dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent.dot,
            flexShrink: 0,
            boxShadow: `0 0 6px ${accent.dot}`,
            marginRight: 2,
          }}
        />
        <span className="note-card-title">{note.title}</span>
        <span className="note-card-date">{formatDate(note.created_at)}</span>
        <span
          className="note-card-chevron"
          style={{ color: expanded ? accent.dot : undefined }}
        >
          ▼
        </span>
      </div>

      {/* Collapsed: 2-line plain-text preview (Markdown tokens stripped) */}
      {!expanded && (
        <p className="note-card-preview">{stripMarkdown(note.content)}</p>
      )}

      {/* Expanded: full Markdown-rendered content */}
      {expanded && (
        <div
          className="note-card-full"
          // Stop the card's toggle-click from firing when the user interacts
          // with content inside (e.g. code copy buttons, links)
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: accent.dot,
            }}
          >
            📄 Full Content
          </div>
          <MarkdownMessage text={note.content || ""} />
        </div>
      )}
    </div>
  );
}
