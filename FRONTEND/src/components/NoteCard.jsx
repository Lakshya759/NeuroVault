// NoteCard.jsx — Premium expandable note card for NeuroVault
// Props:
//   note: { id, title, content, created_at }

import { useState } from "react";

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

      {/* Collapsed: 2-line preview */}
      {!expanded && (
        <p className="note-card-preview">{note.content}</p>
      )}

      {/* Expanded: full content */}
      {expanded && (
        <div className="note-card-full">
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
          {note.content}
        </div>
      )}
    </div>
  );
}
