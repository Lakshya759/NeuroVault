// NotesPage.jsx — Knowledge Vault viewer for NeuroVault
//
// Responsibilities:
//   • Display all notes/materials in the user's vault
//   • Note analytics (stat cards: total, this week, conversations, topics)
//   • Recently Added panel + Most Asked Topics panel
//   • Search/filter notes by title or content
//
// NOT here:
//   • PDF upload (→ /ingest)
//   • Text note creation (→ /ingest)
//   • Ingestion job tracking (→ /ingest)

import { useState, useEffect, useMemo } from "react";
import { getNotes, getAllConversations } from "../api";
import NoteCard from "../components/NoteCard";
import Spinner from "../components/Spinner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}

// Extract top meaningful keywords from conversation titles for the "topics" panel
const STOPWORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","up","about","into","is","it","its","this","that","these",
  "those","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","not",
  "no","nor","so","yet","both","either","neither","each","few","more",
  "most","other","some","such","than","then","too","very","just","how",
  "what","when","where","who","why","i","my","me","we","our","you","your",
  "he","she","they","them","their","if","any","all","new","get","got","use",
]);

function extractTopics(conversations, topN = 6) {
  const freq = {};
  conversations.forEach(({ title }) => {
    if (!title) return;
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, accent }) {
  return (
    <div className="stat-card" style={{ "--stat-accent": accent }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

// ── NotesPage ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  // ── Notes list state ───────────────────────────────────────────────────────
  const [notes, setNotes] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── Search state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Conversations (for topics panel) ──────────────────────────────────────
  const [conversations, setConversations] = useState([]);

  // ── Load notes + conversations on mount ───────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      try {
        const [notesData, convoData] = await Promise.allSettled([
          getNotes(),
          getAllConversations(),
        ]);
        if (notesData.status === "fulfilled") setNotes(notesData.value.data || []);
        else setListError(notesData.reason?.message || "Failed to load notes.");

        if (convoData.status === "fulfilled") setConversations(convoData.value.data || []);
        // conversations failure is non-fatal — topics section just stays empty
      } finally {
        setListLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Derived / computed values ─────────────────────────────────────────────

  const notesSortedByDate = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [notes]
  );

  const recentNotes = useMemo(() => notesSortedByDate.slice(0, 3), [notesSortedByDate]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = useMemo(
    () => notes.filter((n) => new Date(n.created_at).getTime() > sevenDaysAgo).length,
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notesSortedByDate;
    return notesSortedByDate.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
    );
  }, [search, notesSortedByDate]);

  const topics = useMemo(() => extractTopics(conversations), [conversations]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <h1 className="page-title">Knowledge Vault</h1>
      <p className="page-subtitle">
        Your personal knowledge base — everything indexed for AI-powered search.
        Add new content via{" "}
        <a href="/ingest" style={{ color: "var(--accent-mid)", fontWeight: 600 }}>
          Ingest
        </a>.
      </p>

      {/* ═══════════════════════════════════════════════════════════════════════
          DASHBOARD
          ═══════════════════════════════════════════════════════════════════════ */}
      {!listLoading && (
        <div className="vault-dashboard">

          {/* ── Stat Cards ──────────────────────────────────────────────────── */}
          <div className="dashboard-stats">
            <StatCard
              icon="📝"
              value={notes.length}
              label="Total Notes"
              accent="var(--accent-mid)"
            />
            <StatCard
              icon="🕐"
              value={recentCount}
              label="Added This Week"
              accent="var(--accent-2)"
            />
            <StatCard
              icon="💬"
              value={conversations.length}
              label="Conversations"
              accent="#f59e0b"
            />
            <StatCard
              icon="🧠"
              value={topics.length > 0 ? topics.length : "—"}
              label="Topics Covered"
              accent="#10b981"
            />
          </div>

          {/* ── Dashboard Bottom Row ─────────────────────────────────────────── */}
          <div className="dashboard-bottom-row">

            {/* Recently Added */}
            <div className="dashboard-panel">
              <p className="dashboard-panel-title">🕐 Recently Added</p>
              {recentNotes.length === 0 ? (
                <p className="dashboard-panel-empty">
                  No notes yet.{" "}
                  <a href="/ingest" style={{ color: "var(--accent-mid)" }}>
                    Add your first one →
                  </a>
                </p>
              ) : (
                <div className="recent-notes-list">
                  {recentNotes.map((note) => (
                    <div key={note.id} className="recent-note-item">
                      <span className="recent-note-dot" />
                      <div className="recent-note-info">
                        <span className="recent-note-title">{note.title}</span>
                        <span className="recent-note-date">{timeAgo(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Asked Topics */}
            <div className="dashboard-panel">
              <p className="dashboard-panel-title">🔥 Most Asked Topics</p>
              {topics.length === 0 ? (
                <p className="dashboard-panel-empty">
                  {conversations.length === 0
                    ? "No conversations yet. Ask the AI something!"
                    : "Not enough data to extract topics."}
                </p>
              ) : (
                <div className="topics-row">
                  {topics.map((topic) => (
                    <span key={topic} className="topic-pill">{topic}</span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SEARCH BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      {!listLoading && notes.length > 0 && (
        <div className="notes-search-wrapper">
          <div className="notes-search-bar">
            <span className="notes-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="notes-search"
              aria-label="Search notes"
            />
            {search && (
              <button
                className="notes-search-clear"
                onClick={() => setSearch("")}
                title="Clear search"
                type="button"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── List header ───────────────────────────────────────────────────────── */}
      <p className="notes-list-header">
        {listLoading ? "Loading…" : search
          ? `${filteredNotes.length} result${filteredNotes.length !== 1 ? "s" : ""} for "${search}"`
          : notes.length > 0
            ? `${notes.length} item${notes.length !== 1 ? "s" : ""} in your vault`
            : "Your vault"}
      </p>

      {listLoading && <Spinner center />}

      {!listLoading && listError && (
        <div className="error-box" role="alert">⚠️ {listError}</div>
      )}

      {/* ── Vault empty state ─────────────────────────────────────────────────── */}
      {!listLoading && !listError && notes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">Your vault is empty</p>
          <p className="empty-state-body">
            Upload a PDF or add a text note via{" "}
            <a href="/ingest" style={{ color: "var(--accent-mid)", fontWeight: 600 }}>
              Ingest
            </a>
            . The AI will reference your vault when answering questions.
          </p>
        </div>
      )}

      {/* ── Search empty state ────────────────────────────────────────────────── */}
      {!listLoading && !listError && notes.length > 0 && filteredNotes.length === 0 && search && (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: "2.5rem" }}>🔍</div>
          <p className="empty-state-title">No notes match "{search}"</p>
          <p className="empty-state-body">
            Try a different keyword, or{" "}
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none", border: "none", color: "var(--accent-mid)",
                cursor: "pointer", fontWeight: 600, fontSize: "inherit",
                padding: 0, fontFamily: "inherit",
              }}
            >
              clear the search
            </button>
            {" "}to see all notes.
          </p>
        </div>
      )}

      {/* ── Notes list ────────────────────────────────────────────────────────── */}
      {!listLoading && !listError && filteredNotes.length > 0 && (
        <div className="notes-list" id="notes-list">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
