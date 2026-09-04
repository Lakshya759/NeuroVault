// useIngestionStore.js — Centralized ingestion job state with localStorage persistence
//
// ARCHITECTURE:
//   This hook is the single source of truth for all ingestion jobs.
//   It persists job metadata to localStorage so jobs survive browser refresh.
//   On mount, it rehydrates from localStorage and re-fetches fresh backend status
//   for every non-terminal job, then resumes polling from the backend's current state.
//
// PERSISTENCE CONTRACT:
//   - Only real jobIds (from HTTP 202) are persisted.
//   - Temporary "tmp-*" upload-phase jobs are NEVER written to localStorage.
//   - The PDF file buffer is NEVER stored — only lightweight metadata.
//
// JOB PHASES (UI):
//   uploading → queued → active → completed | failed
//
// BULLMQ STATES (backend):
//   waiting | delayed | active | completed | failed

import { useState, useEffect, useRef, useCallback } from "react";
import { getPDFJobStatus } from "../api";

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "nv_ingestion_jobs";
const POLL_MS = 2000;
const TERMINAL_PHASES = new Set(["completed", "failed"]);

// ── localStorage helpers ──────────────────────────────────────────────────────

function readPersistedJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistJobs(jobs) {
  try {
    // Only persist real, non-temp jobs. Never store tmp-* keys.
    const persistable = jobs.filter(
      (j) => !String(j.jobId).startsWith("tmp-")
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    // localStorage full or disabled — degrade gracefully
  }
}

// ── BullMQ state → UI phase mapping ──────────────────────────────────────────
function stateToPhase(state) {
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  if (state === "active") return "active";
  return "queued"; // waiting | delayed
}

// ── useIngestionStore ─────────────────────────────────────────────────────────
export function useIngestionStore() {
  // Initialize from localStorage so jobs survive page refresh immediately
  const [jobs, setJobsRaw] = useState(() => readPersistedJobs());

  // interval registry — not in state to avoid spurious re-renders
  const intervalsRef = useRef(new Map()); // Map<jobId, intervalId>

  // Wrap setJobsRaw so callers don't need to think about the setter identity
  const setJobs = useCallback((updater) => setJobsRaw(updater), []);

  // Sync jobs → localStorage on every change (only real jobs, no tmp-)
  useEffect(() => {
    persistJobs(jobs);
  }, [jobs]);

  // ── addJob ──────────────────────────────────────────────────────────────────
  // Inserts a new job at the top. Silently ignores if jobId already exists.
  const addJob = useCallback(
    (job) => {
      setJobs((prev) => {
        if (prev.some((j) => j.jobId === job.jobId)) return prev;
        return [job, ...prev];
      });
    },
    [setJobs]
  );

  // ── updateJob ───────────────────────────────────────────────────────────────
  // Merges patch into the job with the given jobId.
  const updateJob = useCallback(
    (jobId, patch) => {
      setJobs((prev) =>
        prev.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j))
      );
    },
    [setJobs]
  );

  // ── removeJob ───────────────────────────────────────────────────────────────
  // Removes a job and clears its polling interval.
  const removeJob = useCallback(
    (jobId) => {
      const id = intervalsRef.current.get(jobId);
      if (id) {
        clearInterval(id);
        intervalsRef.current.delete(jobId);
      }
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
    },
    [setJobs]
  );

  // ── stopPolling ─────────────────────────────────────────────────────────────
  // Clears the polling interval for a job without removing it from the list.
  const stopPolling = useCallback((jobId) => {
    const id = intervalsRef.current.get(jobId);
    if (id) {
      clearInterval(id);
      intervalsRef.current.delete(jobId);
    }
  }, []);

  // ── pollJob ─────────────────────────────────────────────────────────────────
  // Starts a 2-second polling interval for a given real jobId.
  // Safe to call multiple times — guards against duplicate intervals.
  const pollJob = useCallback(
    (jobId) => {
      if (intervalsRef.current.has(jobId)) return; // no duplicates

      const id = setInterval(async () => {
        try {
          const res = await getPDFJobStatus(jobId);
          const { state, progress, result, error } = res.data;
          const phase = stateToPhase(state);

          setJobs((prev) =>
            prev.map((j) =>
              j.jobId === jobId
                ? {
                    ...j,
                    phase,
                    state,
                    progress:
                      typeof progress === "number" ? progress : j.progress ?? 0,
                    result: result ?? j.result,
                    error: error ?? j.error,
                  }
                : j
            )
          );

          if (TERMINAL_PHASES.has(phase)) {
            clearInterval(id);
            intervalsRef.current.delete(jobId);

            if (phase === "failed") {
              // Failed jobs auto-remove after 5s (show error briefly, then gone)
              setTimeout(() => {
                setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
              }, 5000);
            }
            // Completed jobs stay in list indefinitely as ingestion history
          }
        } catch {
          // Transient network error — silently retry on next tick.
          // DO NOT mark job as failed — only backend state === "failed" does that.
        }
      }, POLL_MS);

      intervalsRef.current.set(jobId, id);
    },
    [setJobs]
  );

  // ── hydrateJobs ─────────────────────────────────────────────────────────────
  // CRITICAL for refresh fix.
  // Called once on IngestionPage mount.
  // For every non-terminal persisted job:
  //   1. Fetches current backend status (source of truth)
  //   2. Updates local state with fresh data
  //   3. Resumes polling if still active/waiting
  const hydrateJobs = useCallback(async () => {
    const stored = readPersistedJobs();
    if (stored.length === 0) return;

    // Ensure state has all persisted jobs (in case of a cold mount where
    // useState initializer already ran — this is a safe no-op if duplicates)
    setJobs((prev) => {
      const existing = new Set(prev.map((j) => j.jobId));
      const missing = stored.filter((j) => !existing.has(j.jobId));
      return missing.length > 0 ? [...missing, ...prev] : prev;
    });

    // Process each non-terminal, non-temp job in parallel
    await Promise.allSettled(
      stored
        .filter(
          (j) =>
            !TERMINAL_PHASES.has(j.phase) &&
            !String(j.jobId).startsWith("tmp-")
        )
        .map(async (job) => {
          try {
            const res = await getPDFJobStatus(job.jobId);
            const { state, progress, result, error } = res.data;
            const phase = stateToPhase(state);

            // Update with FRESH backend data — this is the source of truth
            setJobs((prev) =>
              prev.map((j) =>
                j.jobId === job.jobId
                  ? {
                      ...j,
                      phase,
                      state,
                      progress:
                        typeof progress === "number"
                          ? progress
                          : j.progress ?? 0,
                      result: result ?? j.result,
                      error: error ?? j.error,
                    }
                  : j
              )
            );

            // Resume polling if job is still active
            if (!TERMINAL_PHASES.has(phase)) {
              pollJob(job.jobId);
            } else if (phase === "failed") {
              // Failed during offline — auto-remove
              setTimeout(() => {
                setJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
              }, 5000);
            }
          } catch {
            // Backend unreachable — keep stored state, try polling anyway
            // so we recover when the server comes back
            if (!TERMINAL_PHASES.has(job.phase)) {
              pollJob(job.jobId);
            }
          }
        })
    );
  }, [setJobs, pollJob]);

  // ── Cleanup all intervals on unmount ────────────────────────────────────────
  // Jobs in localStorage are NOT deleted on unmount — they persist.
  // On next mount, hydrateJobs() will resume polling for active ones.
  useEffect(() => {
    const ref = intervalsRef.current;
    return () => {
      ref.forEach((id) => clearInterval(id));
      ref.clear();
    };
  }, []);

  return {
    jobs,
    addJob,
    updateJob,
    removeJob,
    hydrateJobs,
    pollJob,
    stopPolling,
  };
}
