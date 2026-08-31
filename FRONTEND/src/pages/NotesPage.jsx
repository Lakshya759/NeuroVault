// NotesPage.jsx — Knowledge Vault with Dashboard for NeuroVault

import { useState, useEffect, useRef, useMemo } from "react";
import { getNotes, createNote, uploadPDF, getAllConversations } from "../api";
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

// Extract top meaningful keywords from conversation titles
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

// ── PDF Drop Zone (unchanged) ─────────────────────────────────────────────────
function PDFUploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  function handleDragOver(e) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped); setError("");
    } else {
      setError("Please drop a valid PDF file.");
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); setError(""); }
  }

  async function handleUpload() {
    if (!file || uploading) return;
    setError(""); setSuccess(false); setUploading(true);
    try {
      const data = await uploadPDF(file);
      onUpload(data.data);
      setFile(null); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "PDF upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {error && <div className="error-box" role="alert">⚠️ {error}</div>}
      {success && <div className="success-box">✅ PDF uploaded and indexed successfully!</div>}
      <div
        className={`drop-zone${dragging ? " active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: "pointer" }}
      >
        <div className="drop-zone-icon">{file ? "📄" : "📁"}</div>
        {file ? (
          <>
            <p className="drop-zone-text" style={{ color: "var(--accent-mid)", fontWeight: 600 }}>{file.name}</p>
            <p className="drop-zone-hint">{(file.size / 1024).toFixed(0)} KB · Click to change file</p>
          </>
        ) : (
          <>
            <p className="drop-zone-text">Drop a PDF here, or click to browse</p>
            <p className="drop-zone-hint">Supported: PDF · The content will be indexed for AI search</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleFileChange} />
      </div>
      {file && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            <span>
              {uploading ? <Spinner size="sm" /> : null}
              {uploading ? "Uploading & indexing…" : "⬆️ Upload PDF"}
            </span>
          </button>
          <button className="btn-icon" onClick={() => { setFile(null); setError(""); }} title="Remove file" style={{ height: 42, width: 42 }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
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
  // ── Upload tab state ───────────────────────────────────────────────────────
  const [uploadTab, setUploadTab] = useState("text");

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Notes list state ───────────────────────────────────────────────────────
  const [notes, setNotes] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── Search state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Conversations (for topics) ─────────────────────────────────────────────
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

  // ── Add text note ──────────────────────────────────────────────────────────
  async function handleAddNote(e) {
    e.preventDefault();
    setFormError(""); setFormSuccess(false); setFormLoading(true);
    try {
      const data = await createNote(title, content);
      setNotes((prev) => [data.data, ...prev]);
      setTitle(""); setContent(""); setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err) {
      setFormError(err.message || "Failed to add note.");
    } finally {
      setFormLoading(false);
    }
  }

  // ── PDF uploaded callback ──────────────────────────────────────────────────
  function handlePDFUploaded(newNote) {
    if (newNote) setNotes((prev) => [newNote, ...prev]);
    setTimeout(async () => {
      try { const data = await getNotes(); setNotes(data.data || []); } catch (_) {}
    }, 800);
  }

  // ── Derived / computed values (no extra state) ────────────────────────────

  // Notes sorted newest-first
  const notesSortedByDate = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [notes]
  );

  // 3 most recently added notes for the dashboard panel
  const recentNotes = useMemo(() => notesSortedByDate.slice(0, 3), [notesSortedByDate]);

  // Notes added in the last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = useMemo(
    () => notes.filter((n) => new Date(n.created_at).getTime() > sevenDaysAgo).length,
    [notes]
  );

  // Search-filtered notes list (searches title + content, case-insensitive)
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notesSortedByDate;
    return notesSortedByDate.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
    );
  }, [search, notesSortedByDate]);

  // Top keywords from conversation titles
  const topics = useMemo(() => extractTopics(conversations), [conversations]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <h1 className="page-title">Knowledge Vault</h1>
      <p className="page-subtitle">
        Save what you learn — the AI searches your vault first when you ask questions.
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

          {/* ── Dashboard Bottom Row: Recently Added + Topics ────────────────── */}
          <div className="dashboard-bottom-row">

            {/* Recently Added */}
            <div className="dashboard-panel">
              <p className="dashboard-panel-title">🕐 Recently Added</p>
              {recentNotes.length === 0 ? (
                <p className="dashboard-panel-empty">No notes yet. Add your first one below.</p>
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
          ADD NOTE FORM
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="form-card notes-add-form">
        <h2 className="section-title">✍️ Add to your vault</h2>

        <div className="upload-tabs">
          <button
            type="button"
            className={`upload-tab${uploadTab === "text" ? " active" : ""}`}
            onClick={() => setUploadTab("text")}
          >
            📝 Write a note
          </button>
          <button
            type="button"
            className={`upload-tab${uploadTab === "pdf" ? " active" : ""}`}
            onClick={() => setUploadTab("pdf")}
          >
            📄 Upload PDF
          </button>
        </div>

        {uploadTab === "text" && (
          <>
            {formError && <div className="error-box" role="alert">⚠️ {formError}</div>}
            {formSuccess && <div className="success-box">✅ Note saved to your vault!</div>}
            <form id="add-note-form" onSubmit={handleAddNote}>
              <div className="form-group">
                <label htmlFor="note-title">Title</label>
                <input
                  id="note-title"
                  type="text"
                  placeholder="e.g. React hooks, Python closures…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="note-content">Content</label>
                <textarea
                  id="note-content"
                  placeholder="Write what you learned — concepts, code, summaries…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                />
              </div>
              <div className="row">
                <button id="add-note-submit" type="submit" className="btn btn-primary" disabled={formLoading}>
                  <span>
                    {formLoading ? <Spinner size="sm" /> : null}
                    {formLoading ? "Saving to vault…" : "💾 Save note"}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}

        {uploadTab === "pdf" && <PDFUploadZone onUpload={handlePDFUploaded} />}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          NOTES LIST
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Search bar — only show when there are notes to search */}
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

      {/* Notes list header */}
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

      {/* Vault empty state */}
      {!listLoading && !listError && notes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">Your vault is empty</p>
          <p className="empty-state-body">
            Add your first note or upload a PDF above. The AI will reference your vault when answering questions.
          </p>
        </div>
      )}

      {/* Search empty state */}
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
            </button>{" "}
            to see all notes.
          </p>
        </div>
      )}

      {/* Notes list */}
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
