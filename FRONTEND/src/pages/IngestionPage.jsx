// IngestionPage.jsx — Full content-entry hub for NeuroVault
//
// Responsibilities:
//   • PDF upload (async, BullMQ) with persistent job tracking
//   • Text note creation
//   • Currently Processing section (uploading / queued / active jobs)
//   • Recently Ingested section (completed jobs — persisted as ingestion history)
//   • Rehydrates from localStorage on mount → fetches fresh backend state → resumes polling
//
// State lives in useIngestionStore (localStorage-backed). Jobs survive browser refresh.

import { useState, useEffect, useRef } from "react";
import { uploadPDF, createNote } from "../api";
import { useIngestionStore } from "../hooks/useIngestionStore";
import Spinner from "../components/Spinner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function friendlyError(msg) {
  if (!msg) return "An unexpected error occurred.";
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("AggregateError") ||
    msg.includes("at Object") ||
    msg.includes("stack trace")
  ) {
    return "Could not connect to the server. Please try again.";
  }
  return msg;
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ progress, indeterminate = false, color }) {
  const barColor = color || "var(--accent-mid)";
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`progress-bar${indeterminate ? " indeterminate" : ""}`}
        style={{
          width: indeterminate ? "40%" : `${Math.min(100, Math.max(0, progress ?? 0))}%`,
          background: `linear-gradient(90deg, var(--accent-1), ${barColor})`,
        }}
      />
    </div>
  );
}

// ── PDFDropZone ───────────────────────────────────────────────────────────────
function PDFDropZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [dropError, setDropError] = useState("");
  const fileInputRef = useRef(null);

  function handleDragOver(e) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setDropError("");
    } else {
      setDropError("Please drop a valid PDF file.");
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); setDropError(""); }
  }

  function handleUpload() {
    if (!file) return;
    onUpload(file);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="ingest-dropzone-wrapper">
      {dropError && (
        <div className="error-box" role="alert">⚠️ {dropError}</div>
      )}
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
            <p className="drop-zone-text" style={{ color: "var(--accent-mid)", fontWeight: 600 }}>
              {file.name}
            </p>
            <p className="drop-zone-hint">{formatBytes(file.size)} · Click to change file</p>
          </>
        ) : (
          <>
            <p className="drop-zone-text">Drop a PDF here, or click to browse</p>
            <p className="drop-zone-hint">Supported: PDF · Content will be extracted and indexed for AI search</p>
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
            id="ingest-upload-pdf-btn"
            className="btn btn-primary"
            onClick={handleUpload}
          >
            <span>⬆️ Upload &amp; Process PDF</span>
          </button>
          <button
            className="btn-icon"
            onClick={() => { setFile(null); setDropError(""); }}
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

// ── TextNoteForm ──────────────────────────────────────────────────────────────
function TextNoteForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess(false); setLoading(true);
    try {
      await createNote(title.trim(), content.trim());
      setTitle(""); setContent(""); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save note.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="error-box" role="alert">⚠️ {error}</div>}
      {success && (
        <div className="success-box">✅ Note saved and indexed in your vault!</div>
      )}
      <form id="ingest-text-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="ingest-note-title">Title</label>
          <input
            id="ingest-note-title"
            type="text"
            placeholder="e.g. React hooks, Python closures…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="ingest-note-content">Content</label>
          <textarea
            id="ingest-note-content"
            placeholder="Write what you learned — concepts, code, summaries…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
          />
        </div>
        <button
          id="ingest-text-submit"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          <span>
            {loading ? <Spinner size="sm" /> : null}
            {loading ? "Saving…" : "💾 Save to vault"}
          </span>
        </button>
      </form>
    </div>
  );
}

// ── IngestionJobCard ──────────────────────────────────────────────────────────
// Renders one ingestion job card. Handles all phases:
//   uploading | queued | active | completed | failed
function IngestionJobCard({ job }) {
  const { phase, fileName, fileSize, progress, error, result, createdAt } = job;

  const cfg = {
    uploading: {
      icon: "⬆️",
      cardClass: "",
      label: "Uploading PDF…",
      subLabel: "Sending file to server…",
      barProgress: progress ?? 0,
      indeterminate: false,
      barColor: "var(--accent-mid)",
      showPct: false,
      showSpinner: true,
    },
    queued: {
      icon: "⏳",
      cardClass: "",
      label: "PDF Uploaded — Processing Queued",
      subLabel: "Accepted by server. Waiting for background worker…",
      barProgress: 0,
      indeterminate: true,
      barColor: "var(--accent-2)",
      showPct: false,
      showSpinner: false,
    },
    active: {
      icon: "⚙️",
      cardClass: "",
      label: "Processing PDF…",
      subLabel: "Cleaning, chunking, and indexing your document",
      barProgress: progress ?? 0,
      indeterminate: false,
      barColor: "var(--accent-2)",
      showPct: true,
      showSpinner: false,
    },
    completed: {
      icon: "✅",
      cardClass: "ingestion-card-completed",
      label: result?.title || fileName,
      subLabel: "Ingestion completed — content is now searchable",
      barProgress: 100,
      indeterminate: false,
      barColor: "var(--color-success)",
      showPct: false,
      showSpinner: false,
    },
    failed: {
      icon: "❌",
      cardClass: "ingestion-card-failed",
      label: phase === "failed" && !error?.includes("upload failed")
        ? "PDF Processing Failed"
        : "PDF Upload Failed",
      subLabel: friendlyError(error),
      barProgress: progress ?? 0,
      indeterminate: false,
      barColor: "var(--color-error)",
      showPct: false,
      showSpinner: false,
    },
  }[phase] ?? {
    icon: "⏳", cardClass: "", label: "Pending…", subLabel: "",
    barProgress: 0, indeterminate: true, barColor: "var(--accent-mid)",
    showPct: false, showSpinner: false,
  };

  return (
    <div
      className={`ingestion-card${cfg.cardClass ? ` ${cfg.cardClass}` : ""}`}
      role="status"
      aria-label={`${fileName} — ${cfg.label}`}
    >
      <div className="ingestion-card-header">
        <span className="ingestion-card-icon">{cfg.icon}</span>
        <div className="ingestion-card-info">
          <span className="ingestion-card-filename">{fileName}</span>
          <span className="ingestion-card-size">
            {fileSize ? formatBytes(fileSize) : ""}
            {createdAt ? (fileSize ? " · " : "") + timeAgo(createdAt) : ""}
          </span>
        </div>
        {cfg.showSpinner && <Spinner size="sm" />}
      </div>

      <div className="ingestion-card-phase">{cfg.label}</div>
      <div className="ingestion-card-sublabel">{cfg.subLabel}</div>

      <ProgressBar
        progress={cfg.barProgress}
        indeterminate={cfg.indeterminate}
        color={cfg.barColor}
      />

      {cfg.showPct && (
        <div className="ingestion-card-pct">{Math.round(progress ?? 0)}%</div>
      )}

      {phase === "completed" && result?.materialId && (
        <div className="ingestion-card-meta">
          <span className="ingestion-card-meta-badge">
            📚 Material #{result.materialId}
          </span>
          <span className="ingestion-card-meta-badge ingestion-badge-success">
            ✓ Indexed
          </span>
        </div>
      )}
    </div>
  );
}

// ── IngestionPage ─────────────────────────────────────────────────────────────
export default function IngestionPage() {
  // Active input tab: "pdf" | "text"
  const [inputTab, setInputTab] = useState("pdf");

  // Centralized store — uses localStorage, survives refresh
  const { jobs, addJob, updateJob, removeJob, hydrateJobs, pollJob } =
    useIngestionStore();

  // Rehydrate on mount: restore from localStorage, fetch fresh backend state,
  // resume polling for active/queued jobs.
  useEffect(() => {
    hydrateJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // ── PDF upload handler ──────────────────────────────────────────────────────
  async function handlePDFUpload(file) {
    const tempKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // 1. Add a temporary "uploading" job (NOT persisted to localStorage)
    addJob({
      jobId: tempKey,
      fileName: file.name,
      fileSize: file.size,
      phase: "uploading",
      state: null,
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
    });

    // 2. Fake upload progress (fetch API doesn't expose XHR upload progress)
    let fakeProgress = 0;
    const ticker = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + (Math.random() * 12 + 4), 85);
      updateJob(tempKey, { progress: Math.round(fakeProgress) });
    }, 350);

    try {
      // 3. Perform the actual HTTP upload
      const data = await uploadPDF(file);
      clearInterval(ticker);

      const jobId = data?.data?.jobId;
      if (!jobId) throw new Error("Server did not return a job ID.");

      // 4. Remove the temporary job and add a REAL job (will be persisted)
      removeJob(tempKey);
      addJob({
        jobId,
        fileName: file.name,
        fileSize: file.size,
        phase: "queued",
        state: "waiting",
        progress: 0,
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
      });

      // 5. Start polling the real job
      pollJob(jobId);
    } catch (err) {
      clearInterval(ticker);

      // Upload failed BEFORE receiving 202 — mark as upload-failed, auto-remove
      updateJob(tempKey, {
        phase: "failed",
        // Use a distinct message so IngestionJobCard can show the right title
        error: `PDF upload failed — ${friendlyError(err.message)}`,
        progress: 0,
      });

      // Temporary upload error: auto-dismiss after 4.5s
      setTimeout(() => removeJob(tempKey), 4500);
    }
  }

  // ── Partition jobs by phase ─────────────────────────────────────────────────
  const activePhases = new Set(["uploading", "queued", "active"]);
  const activeJobs = jobs.filter((j) => activePhases.has(j.phase));
  const completedJobs = jobs.filter((j) => j.phase === "completed");
  // Failed jobs auto-remove after 5s from the store, so we show them briefly
  // in the active section while they're still present
  const failedJobs = jobs.filter((j) => j.phase === "failed");

  // All "currently processing" = active + failed (briefly visible)
  const inProgressJobs = [...activeJobs, ...failedJobs];

  return (
    <div className="page">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <h1 className="page-title">📥 Ingest Content</h1>
      <p className="page-subtitle">
        Bring content into your knowledge vault. Upload a PDF or write a note —
        all content is extracted, chunked, and indexed for AI-powered search.
      </p>

      {/* ═══════════════════════════════════════════════════════════════════════
          INPUT FORM
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="form-card notes-add-form">
        <h2 className="section-title">✨ Add to your vault</h2>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="upload-tabs">
          <button
            type="button"
            className={`upload-tab${inputTab === "pdf" ? " active" : ""}`}
            onClick={() => setInputTab("pdf")}
            id="ingest-tab-pdf"
          >
            📄 Upload PDF
          </button>
          <button
            type="button"
            className={`upload-tab${inputTab === "text" ? " active" : ""}`}
            onClick={() => setInputTab("text")}
            id="ingest-tab-text"
          >
            📝 Add Text Note
          </button>
        </div>

        {inputTab === "pdf" && <PDFDropZone onUpload={handlePDFUpload} />}
        {inputTab === "text" && <TextNoteForm />}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CURRENTLY PROCESSING
          ═══════════════════════════════════════════════════════════════════════ */}
      {inProgressJobs.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <p className="notes-list-header">
            Currently Processing ({inProgressJobs.length})
          </p>
          <div className="ingestion-jobs-list">
            {inProgressJobs.map((job) => (
              <IngestionJobCard key={job.jobId} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          RECENTLY INGESTED — persistent ingestion history
          ═══════════════════════════════════════════════════════════════════════ */}
      {completedJobs.length > 0 && (
        <div>
          <p className="notes-list-header">
            Recently Ingested ({completedJobs.length})
          </p>
          <div className="ingestion-jobs-list">
            {completedJobs.map((job) => (
              <IngestionJobCard key={job.jobId} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EMPTY STATE
          ═══════════════════════════════════════════════════════════════════════ */}
      {inProgressJobs.length === 0 && completedJobs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">No ingestion history yet</p>
          <p className="empty-state-body">
            Upload a PDF or add a text note above. Processed content will appear here
            and remain visible even after you refresh the browser.
          </p>
        </div>
      )}
    </div>
  );
}
