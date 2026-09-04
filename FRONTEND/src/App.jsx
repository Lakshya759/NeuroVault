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

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    onLogout();
    navigate("/auth");
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <span className="navbar-brand">
        <span className="navbar-brand-icon">🧠</span>
        NeuroVault
      </span>

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
    </nav>
  );
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function Protected({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await getUser();
        setUser(data.data);
      } catch (_) {
        setUser(null);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, []);

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-logo">🧠 NeuroVault</div>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}

      <Routes>
        {/* Default redirect — go to Ingest first so users see the hub */}
        <Route path="/" element={<Navigate to={user ? "/ingest" : "/auth"} replace />} />

        <Route
          path="/auth"
          element={user ? <Navigate to="/ingest" replace /> : <AuthPage onLogin={setUser} />}
        />

        {/* ── Content ingestion hub ──────────────────────────────────────── */}
        <Route
          path="/ingest"
          element={
            <Protected user={user}>
              <IngestionPage />
            </Protected>
          }
        />

        {/* ── Notes viewer ──────────────────────────────────────────────── */}
        <Route
          path="/notes"
          element={<Protected user={user}><NotesPage /></Protected>}
        />

        <Route
          path="/ask"
          element={<Protected user={user}><AskPage /></Protected>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
