// MaterialsPage.jsx — Permanent material library for NeuroVault
//
// Responsibilities:
//   • Fetch all user materials from GET /material
//   • Show total material count (stat card)
//   • Show "Recently Uploaded" panel (last 3 by created_at)
//   • Show searchable/filterable full material list
//   • Re-fetch when `refreshKey` prop changes (triggered by IngestionPage completing a job)

import { useState, useEffect, useMemo } from "react";
import { getMaterials } from "../api";
import NoteCard from "../components/NoteCard";
import Spinner from "../components/Spinner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── StatCard (reuse same design as NotesPage) ──────────────────────────────────
function StatCard({ icon, value, label, accent }) {
  return (
    <div className="stat-card" style={{ "--stat-accent": accent }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

// ── MaterialCard ───────────────────────────────────────────────────────────────
// A richer card for materials — shows type badge, date, and expandable content
function MaterialCard({ material }) {
  const isPDF = !material.content || material.content === "" || material.source_type === "pdf";

  return (
    <NoteCard note={material} />
  );
}

// ── MaterialsPage ──────────────────────────────────────────────────────────────
export default function MaterialsPage({ refreshKey }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Fetch (or re-fetch) whenever refreshKey changes
  useEffect(() => {
    let cancelled = false;
    async function fetchMaterials() {
      setLoading(true);
      setError("");
      try {
        const data = await getMaterials();
        if (!cancelled) setMaterials(data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load materials.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMaterials();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Sort newest first
  const sorted = useMemo(
    () => [...materials].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [materials]
  );

  // Last 3 for "Recently Uploaded"
  const recentMaterials = useMemo(() => sorted.slice(0, 3), [sorted]);

  // Added this week count
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = useMemo(
    () => materials.filter((m) => new Date(m.created_at).getTime() > sevenDaysAgo).length,
    [materials]
  );

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q)
    );
  }, [search, sorted]);

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <h1 className="page-title">📚 Materials</h1>
      <p className="page-subtitle">
        Your permanent knowledge library — all processed PDFs and notes indexed for AI search.
      </p>

      {/* ── Dashboard stats ─────────────────────────────────────────────────── */}
      {!loading && (
        <div className="vault-dashboard">
          <div className="dashboard-stats">
            <StatCard
              icon="📚"
              value={materials.length}
              label="Total Materials"
              accent="var(--accent-mid)"
            />
            <StatCard
              icon="🕐"
              value={recentCount}
              label="Added This Week"
              accent="var(--accent-2)"
            />
            <StatCard
              icon="📄"
              value={materials.filter(
                (m) => !m.content || m.content === "" || m.content === null
              ).length || "—"}
              label="PDFs Indexed"
              accent="#10b981"
            />
            <StatCard
              icon="📝"
              value={materials.filter(
                (m) => m.content && m.content.trim() !== ""
              ).length || "—"}
              label="Text Notes"
              accent="#f59e0b"
            />
          </div>

          {/* ── Dashboard bottom row ────────────────────────────────────────── */}
          <div className="dashboard-bottom-row">
            {/* Recently Uploaded */}
            <div className="dashboard-panel">
              <p className="dashboard-panel-title">🕐 Recently Uploaded</p>
              {recentMaterials.length === 0 ? (
                <p className="dashboard-panel-empty">
                  No materials yet. Upload a PDF in the Ingest section.
                </p>
              ) : (
                <div className="recent-notes-list">
                  {recentMaterials.map((m) => (
                    <div key={m.id} className="recent-note-item">
                      <span className="recent-note-dot" />
                      <div className="recent-note-info">
                        <span className="recent-note-title">{m.title}</span>
                        <span className="recent-note-date">{timeAgo(m.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats panel */}
            <div className="dashboard-panel">
              <p className="dashboard-panel-title">📊 Library Overview</p>
              {materials.length === 0 ? (
                <p className="dashboard-panel-empty">Your vault is empty.</p>
              ) : (
                <div className="materials-overview-list">
                  <div className="materials-overview-row">
                    <span className="materials-overview-label">Oldest material</span>
                    <span className="materials-overview-value">
                      {formatDate(sorted[sorted.length - 1]?.created_at)}
                    </span>
                  </div>
                  <div className="materials-overview-row">
                    <span className="materials-overview-label">Newest material</span>
                    <span className="materials-overview-value">
                      {formatDate(sorted[0]?.created_at)}
                    </span>
                  </div>
                  <div className="materials-overview-row">
                    <span className="materials-overview-label">Last updated</span>
                    <span className="materials-overview-value">
                      {timeAgo(sorted[0]?.created_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      {!loading && materials.length > 0 && (
        <div className="notes-search-wrapper">
          <div className="notes-search-bar">
            <span className="notes-search-icon">🔍</span>
            <input
              id="materials-search"
              type="text"
              placeholder="Search by title or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search materials"
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

      {/* ── List header ─────────────────────────────────────────────────────── */}
      <p className="notes-list-header">
        {loading
          ? "Loading…"
          : search
          ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search}"`
          : materials.length > 0
          ? `${materials.length} material${materials.length !== 1 ? "s" : ""} in your vault`
          : "Your vault"}
      </p>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && <Spinner center />}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="error-box" role="alert">⚠️ {error}</div>
      )}

      {/* ── Empty vault ─────────────────────────────────────────────────────── */}
      {!loading && !error && materials.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">Your vault is empty</p>
          <p className="empty-state-body">
            Upload a PDF in the{" "}
            <strong style={{ color: "var(--accent-mid)" }}>Ingest</strong> section to
            get started. Processed materials will appear here automatically.
          </p>
        </div>
      )}

      {/* ── Search empty ────────────────────────────────────────────────────── */}
      {!loading && !error && materials.length > 0 && filtered.length === 0 && search && (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: "2.5rem" }}>🔍</div>
          <p className="empty-state-title">No materials match "{search}"</p>
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
            to see all materials.
          </p>
        </div>
      )}

      {/* ── Materials list ──────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="notes-list" id="materials-list">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  );
}
