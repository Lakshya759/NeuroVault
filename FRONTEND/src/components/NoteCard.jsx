// NoteCard.jsx — displays a single note, collapsed or expanded
// Props:
//   note: { id, title, content, created_at }

import { useState } from "react";

// Format ISO date string → "Aug 19, 2026"
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NoteCard({ note }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`note-card${expanded ? " expanded" : ""}`}
      onClick={() => setExpanded((prev) => !prev)}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((prev) => !prev)}
    >
      <div className="note-card-header">
        <span className="note-card-title">{note.title}</span>
        <span className="note-card-date">{formatDate(note.created_at)}</span>
        <span className="note-card-chevron">▼</span>
      </div>

      {/* Collapsed: show a 2-line preview */}
      {!expanded && (
        <p className="note-card-preview">{note.content}</p>
      )}

      {/* Expanded: show full content */}
      {expanded && (
        <div className="note-card-full">{note.content}</div>
      )}
    </div>
  );
}
