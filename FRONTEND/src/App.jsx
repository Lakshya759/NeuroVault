// App.jsx — root component with premium NeuroVault branding

import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { getUser, logout } from "./api";
import AuthPage from "./pages/AuthPage";
import NotesPage from "./pages/NotesPage";
import AskPage from "./pages/AskPage";
import IngestionPage from "./pages/IngestionPage";
import Spinner from "./components/Spinner";
import "./App.css";

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    setMenuOpen(false);
    onLogout();
    navigate("/auth");
  }

  // Close drawer when a nav link is clicked
  function handleNavClick() {
    setMenuOpen(false);
  }

  // Close drawer when clicking the backdrop
  function handleBackdropClick() {
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <span className="navbar-brand">
          <span className="navbar-brand-icon">🧠</span>
          NeuroVault
        </span>

        {/* Desktop nav links */}
        <div className="navbar-links">
          <NavLink
            to="/ingest"
            id="nav-ingest"
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          >
            📥 Ingest
          </NavLink>

          <NavLink
            to="/notes"
            id="nav-notes"
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          >
            📝 Notes
          </NavLink>

          <NavLink
            to="/ask"
            id="nav-ask"
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          >
            ✨ Ask AI
          </NavLink>

          <div className="navbar-divider" />

          <button id="nav-logout" className="navbar-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        {/* Hamburger button — mobile only */}
        <button
          id="nav-hamburger"
          className={`navbar-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="navbar-backdrop"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}
      <div className={`navbar-drawer${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <NavLink
          to="/ingest"
          id="nav-ingest-mobile"
          className={({ isActive }) => "navbar-drawer-link" + (isActive ? " active" : "")}
          onClick={handleNavClick}
        >
          <span className="navbar-drawer-link-icon">📥</span>
          Ingest
        </NavLink>

        <NavLink
          to="/notes"
          id="nav-notes-mobile"
          className={({ isActive }) => "navbar-drawer-link" + (isActive ? " active" : "")}
          onClick={handleNavClick}
        >
          <span className="navbar-drawer-link-icon">📝</span>
          Notes
        </NavLink>

        <NavLink
          to="/ask"
          id="nav-ask-mobile"
          className={({ isActive }) => "navbar-drawer-link" + (isActive ? " active" : "")}
          onClick={handleNavClick}
        >
          <span className="navbar-drawer-link-icon">✨</span>
          Ask AI
        </NavLink>

        <div className="navbar-drawer-divider" />

        <button
          id="nav-logout-mobile"
          className="navbar-drawer-logout"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </>
  );
}

// ── Protected route wrapper ───────────────────────────────────────────────────
// While checking=true, render a loading splash instead of redirecting.
// This prevents prematurely bouncing an authenticated user to /auth
// just because the in-memory React state was cleared by a browser restart.
function Protected({ checking, user, children }) {
  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-logo">🧠 NeuroVault</div>
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  // Start as true — auth state is unknown until the session check finishes.
  // Using true (not false) as the initial value ensures we never
  // redirect an authenticated user to /auth before the cookie is verified.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await getUser();
        setUser(data.data);
      } catch (_) {
        // 401 / network error — treat as unauthenticated
        setUser(null);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, []);

  // BrowserRouter is placed here — wrapping the entire tree from the very
  // first render — so window.location (e.g. /ingest) is captured by the
  // router immediately, even while the session check is still in-flight.
  // Previously the router was only mounted AFTER checking=false, meaning
  // the URL was effectively discarded during the loading phase.
  return (
    <BrowserRouter>
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}

      <Routes>
        {/* Default redirect — deferred until auth check is done */}
        <Route
          path="/"
          element={
            checking
              ? (
                <div className="loading-screen">
                  <div className="loading-screen-logo">🧠 NeuroVault</div>
                  <Spinner size="lg" />
                </div>
              )
              : <Navigate to={user ? "/ingest" : "/auth"} replace />
          }
        />

        {/* Auth page — also deferred to avoid flashing auth UI to valid session */}
        <Route
          path="/auth"
          element={
            checking
              ? (
                <div className="loading-screen">
                  <div className="loading-screen-logo">🧠 NeuroVault</div>
                  <Spinner size="lg" />
                </div>
              )
              : user
                ? <Navigate to="/ingest" replace />
                : <AuthPage onLogin={setUser} />
          }
        />

        {/* ── Content ingestion hub ──────────────────────────────────────── */}
        <Route
          path="/ingest"
          element={
            <Protected checking={checking} user={user}>
              <IngestionPage />
            </Protected>
          }
        />

        {/* ── Notes viewer ──────────────────────────────────────────────── */}
        <Route
          path="/notes"
          element={
            <Protected checking={checking} user={user}>
              <NotesPage />
            </Protected>
          }
        />

        <Route
          path="/ask"
          element={
            <Protected checking={checking} user={user}>
              <AskPage />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
