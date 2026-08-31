// NotesPage.jsx — Premium notes page with text & PDF upload for NeuroVault

import { useState, useEffect, useRef } from "react";
import { getNotes, createNote, uploadPDF } from "../api";
import NoteCard from "../components/NoteCard";
import Spinner from "../components/Spinner";

// ── PDF Drop Zone ──────────────────────────────────────────────────────────────
function PDFUploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() { setDragging(false); }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setError("");
    } else {
      setError("Please drop a valid PDF file.");
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError("");
    }
  }

  async function handleUpload() {
    if (!file || uploading) return;
    setError("");
    setSuccess(false);
    setUploading(true);
    try {
      const data = await uploadPDF(file);
      onUpload(data.data);
      setFile(null);
      setSuccess(true);
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

      {/* Drop zone */}
      <div
        className={`drop-zone${dragging ? " active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: "pointer" }}
      >
        <div className="drop-zone-icon">
          {file ? "📄" : "📁"}
        </div>
        {file ? (
          <>
            <p className="drop-zone-text" style={{ color: "var(--accent-mid)", fontWeight: 600 }}>
              {file.name}
            </p>
            <p className="drop-zone-hint">
              {(file.size / 1024).toFixed(0)} KB · Click to change file
            </p>
          </>
        ) : (
          <>
            <p className="drop-zone-text">Drop a PDF here, or click to browse</p>
            <p className="drop-zone-hint">Supported: PDF · The content will be indexed for AI search</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {file && (
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading}
          >
            <span>
              {uploading ? <Spinner size="sm" /> : null}
              {uploading ? "Uploading & indexing…" : "⬆️ Upload PDF"}
            </span>
          </button>
          <button
            className="btn-icon"
            onClick={() => { setFile(null); setError(""); }}
            title="Remove file"
            style={{ height: 42, width: 42 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── NotesPage ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  // ── Upload tab state ───────────────────────────────────────────────────────
  const [uploadTab, setUploadTab] = useState("text"); // "text" | "pdf"

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

  // ── Load notes on mount ────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchNotes() {
      try {
        const data = await getNotes();
        setNotes(data.data || []);
      } catch (err) {
        setListError(err.message || "Failed to load notes.");
      } finally {
        setListLoading(false);
      }
    }
    fetchNotes();
  }, []);

  // ── Add text note ──────────────────────────────────────────────────────────
  async function handleAddNote(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);
    setFormLoading(true);
    try {
      const data = await createNote(title, content);
      setNotes((prev) => [data.data, ...prev]);
      setTitle("");
      setContent("");
      setFormSuccess(true);
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
    // Refresh full list to pick up all chunks as a single entry
    setTimeout(async () => {
      try {
        const data = await getNotes();
        setNotes(data.data || []);
      } catch (_) {}
    }, 800);
  }

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <h1 className="page-title">Knowledge Vault</h1>
      <p className="page-subtitle">
        Save what you learn — the AI searches your vault first when you ask questions.
      </p>

      {/* ── Add Knowledge form ──────────────────────────────────────────────── */}
      <div className="form-card notes-add-form">
        <h2 className="section-title">✍️ Add to your vault</h2>

        {/* Upload type tabs */}
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

        {/* Text note form */}
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
                <button
                  id="add-note-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  <span>
                    {formLoading ? <Spinner size="sm" /> : null}
                    {formLoading ? "Saving to vault…" : "💾 Save note"}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* PDF upload zone */}
        {uploadTab === "pdf" && (
          <PDFUploadZone onUpload={handlePDFUploaded} />
        )}
      </div>

      {/* ── Notes list header ───────────────────────────────────────────────── */}
      <p className="notes-list-header">
        {notes.length > 0
          ? `${notes.length} item${notes.length !== 1 ? "s" : ""} in your vault`
          : "Your vault"}
      </p>

      {listLoading && <Spinner center />}

      {!listLoading && listError && (
        <div className="error-box" role="alert">⚠️ {listError}</div>
      )}

      {!listLoading && !listError && notes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">Your vault is empty</p>
          <p className="empty-state-body">
            Add your first note or upload a PDF above. The AI will reference your vault when answering questions.
          </p>
        </div>
      )}

      {!listLoading && !listError && notes.length > 0 && (
        <div className="notes-list" id="notes-list">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
