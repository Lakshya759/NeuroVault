import { useState, useEffect } from "react";
import MarkdownMessage from "./MarkdownMessage";

/**
 * SourcesPanel Component
 * Displays a collapsible panel showing the RAG sources used to generate the assistant response.
 * Each source card is clickable — opens a modal with the full source content.
 *
 * Props:
 *   sources: Array of objects containing chunkId, materialId, title, content, similarity.
 */

// ── Source Detail Modal ────────────────────────────────────────────────────────
function SourceModal({ source, onClose, getPercentage, getMatchLabel, getMatchClass }) {
  const pct = getPercentage(source.similarity || 0);
  const matchBadge = getMatchLabel(source.similarity || 0);
  const badgeClass = getMatchClass(source.similarity || 0);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0, 0, 0, 0.70)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label={source.title || "Source detail"}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.2)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          animation: "slide-in 0.22s ease",
          overflow: "hidden",
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              📚 Source
            </p>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.4,
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {source.title || "Untitled Note"}
            </h2>

            {/* Match row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {pct}%
              </span>
              <span className={`source-match-badge ${badgeClass}`}>
                {matchBadge}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                Retrieval match
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{ width: 36, height: 36, fontSize: "1rem", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* ── Modal Body (scrollable) ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px 24px",
          }}
          className="source-modal-body"
        >
          {source.content
            ? <MarkdownMessage text={source.content} />
            : <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No content available.</p>
          }
        </div>
      </div>
    </div>
  );
}

// ── SourcesPanel ───────────────────────────────────────────────────────────────
export default function SourcesPanel({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSource, setActiveSource] = useState(null);

  // Handle edge cases: sources is undefined, null, or empty array
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  // Convert similarity score to rounded percentage (handles 0-1, as well as fallback for 0-100)
  const getPercentage = (similarity) => {
    const score = Number(similarity);
    if (isNaN(score)) return 0;
    if (score > 1) return Math.round(score);
    return Math.round(score * 100);
  };

  // Map similarity to Match Level label
  const getMatchLabel = (similarity) => {
    const score = Number(similarity);
    if (isNaN(score)) return "Low match";
    const val = score > 1 ? score / 100 : score;
    if (val >= 0.75) return "High match";
    if (val >= 0.60) return "Moderate match";
    return "Low match";
  };

  // CSS class helper for badges based on similarity
  const getMatchClass = (similarity) => {
    const score = Number(similarity);
    if (isNaN(score)) return "low-match";
    const val = score > 1 ? score / 100 : score;
    if (val >= 0.75) return "high-match";
    if (val >= 0.60) return "moderate-match";
    return "low-match";
  };

  // Compute maximum similarity for the overall relevance label in the collapsed header
  const maxSimilarity = Math.max(...sources.map((s) => Number(s.similarity) || 0));
  const getOverallRelevance = (similarity) => {
    const val = similarity > 1 ? similarity / 100 : similarity;
    if (val >= 0.75) return "High relevance";
    if (val >= 0.60) return "Moderate relevance";
    return "Low relevance";
  };
  const overallRelevance = getOverallRelevance(maxSimilarity);

  // Truncate long content to approximately 180 characters (between 150-200)
  const truncateContent = (content, limit = 180) => {
    if (!content) return "";
    if (content.length <= limit) return content;
    return content.slice(0, limit) + "...";
  };

  const handleCardClick = (src) => {
    setActiveSource(src);
  };

  const handleCloseModal = () => {
    setActiveSource(null);
  };

  return (
    <>
      <div className={`sources-panel ${isExpanded ? "expanded" : "collapsed"}`}>
        <button
          type="button"
          className="sources-toggle-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          title={isExpanded ? "Collapse sources" : "Expand sources"}
        >
          <span className="sources-toggle-text">
            {isExpanded ? (
              <>📚 Sources &middot; {sources.length} {sources.length === 1 ? "source" : "sources"}</>
            ) : (
              <>📚 {sources.length} {sources.length === 1 ? "Source" : "Sources"} &nbsp;&middot;&nbsp; {overallRelevance}</>
            )}
          </span>
          <span className="sources-toggle-chevron">{isExpanded ? "▼" : "▶"}</span>
        </button>

        {isExpanded && (
          <div className="sources-list-container">
            <div className="sources-list">
              {sources.map((src, index) => {
                const similarityVal = src.similarity || 0;
                const pct = getPercentage(similarityVal);
                const matchBadge = getMatchLabel(similarityVal);
                const badgeClass = getMatchClass(similarityVal);

                return (
                  <div
                    key={src.chunkId || `src-${index}`}
                    className="source-card source-card-clickable"
                    onClick={() => handleCardClick(src)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View full content: ${src.title || "Untitled Note"}`}
                    onKeyDown={(e) => e.key === "Enter" && handleCardClick(src)}
                  >
                    <div className="source-card-header">
                      <span className="source-card-title" title={src.title}>
                        {src.title || "Untitled Note"}
                      </span>
                      <div className="source-card-metrics">
                        <span className="source-similarity-pct">{pct}%</span>
                        <span className={`source-match-badge ${badgeClass}`}>
                          {matchBadge}
                        </span>
                      </div>
                    </div>
                    <div className="source-card-body">
                      {truncateContent(src.content)}
                    </div>
                    <div className="source-card-hint">
                      Click to view full content →
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal rendered via React portal-like pattern at root of JSX tree */}
      {activeSource && (
        <SourceModal
          source={activeSource}
          onClose={handleCloseModal}
          getPercentage={getPercentage}
          getMatchLabel={getMatchLabel}
          getMatchClass={getMatchClass}
        />
      )}
    </>
  );
}
