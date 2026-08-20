// NotesPage.jsx — Add a note and see the list of existing notes

import { useState, useEffect } from "react";
import { getNotes, createNote } from "../api";
import NoteCard from "../components/NoteCard";
import Spinner from "../components/Spinner";

export default function NotesPage() {
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

  // ── Load existing notes on mount ───────────────────────────────────────────
  useEffect(() => {
    async function fetchNotes() {
      try {
        const data = await getNotes();
        // data.data is the array of notes from ApiResponse wrapper
        setNotes(data.data || []);
      } catch (err) {
        setListError(err.message || "Failed to load notes.");
      } finally {
        setListLoading(false);
      }
    }
    fetchNotes();
  }, []);

  // ── Add note handler ───────────────────────────────────────────────────────
  async function handleAddNote(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);
    setFormLoading(true);

    try {
      const data = await createNote(title, content);
      // Prepend the new note to the list so it shows up immediately
      setNotes((prev) => [data.data, ...prev]);
      setTitle("");
      setContent("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 2500);
    } catch (err) {
      setFormError(err.message || "Failed to add note.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">My Notes</h1>
      <p className="page-subtitle">
        Add anything you're learning. The AI will use these to answer your questions.
      </p>

      {/* ── Add Note form ──────────────────────────────────────────────────── */}
      <div className="form-card notes-add-form">
        <h2 className="section-title">Add a note</h2>

        {formError && (
          <div className="error-box" role="alert">{formError}</div>
        )}
        {formSuccess && (
          <div className="error-box" style={{ color: "var(--color-success)", background: "var(--color-success-soft)", borderColor: "#c3e6d8" }}>
            ✓ Note saved!
          </div>
        )}

        <form id="add-note-form" onSubmit={handleAddNote}>
          <div className="form-group">
            <label htmlFor="note-title">Title</label>
            <input
              id="note-title"
              type="text"
              placeholder="e.g. React hooks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="note-content">Content</label>
            <textarea
              id="note-content"
              placeholder="Write what you learned…"
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
              {formLoading ? <Spinner size="sm" /> : null}
              {formLoading ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Notes list ────────────────────────────────────────────────────── */}
      <p className="notes-list-header">
        {notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : "Your notes"}
      </p>

      {listLoading && <Spinner center />}

      {!listLoading && listError && (
        <div className="error-box" role="alert">{listError}</div>
      )}

      {!listLoading && !listError && notes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">No notes yet</p>
          <p className="empty-state-body">
            Add your first note above — the AI will reference it when you ask questions.
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
