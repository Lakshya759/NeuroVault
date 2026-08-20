// App.jsx — root component
// Handles:
//   - Session check on startup (GET /users/user via cookie)
//   - React Router setup: /auth, /notes, /ask
//   - Top navbar (shown when logged in)
//   - Redirects: unauthenticated → /auth, authenticated root → /notes

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
import Spinner from "./components/Spinner";
import "./App.css";

// ── Navbar (rendered inside BrowserRouter so it can use useNavigate) ─────────
function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } catch (_) {
      // Even if the request fails, clear local state and redirect
    }
    onLogout();
    navigate("/auth");
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <span className="navbar-brand">🧠 Knowledge OS</span>

      <NavLink
        to="/notes"
        id="nav-notes"
        className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
      >
        Notes
      </NavLink>

      <NavLink
        to="/ask"
        id="nav-ask"
        className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
      >
        Ask
      </NavLink>

      <button id="nav-logout" className="navbar-logout" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}

// ── Protected route wrapper ───────────────────────────────────────────────────
// If the user is not authenticated, redirect to /auth.
function Protected({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);       // null = unknown / logged out
  const [checking, setChecking] = useState(true); // true while verifying cookie

  // On mount, check if a valid session cookie already exists
  useEffect(() => {
    async function checkSession() {
      try {
        const data = await getUser();
        setUser(data.data); // { id, name, email }
      } catch (_) {
        setUser(null); // cookie missing / expired
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, []);

  // Show a full-screen spinner while we verify the session
  if (checking) {
    return (
      <div className="loading-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Navbar is only shown when logged in */}
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}

      <Routes>
        {/* Root → redirect based on auth state */}
        <Route
          path="/"
          element={<Navigate to={user ? "/notes" : "/auth"} replace />}
        />

        {/* Auth screen — redirect away if already logged in */}
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to="/notes" replace />
            ) : (
              <AuthPage onLogin={setUser} />
            )
          }
        />

        {/* Protected screens */}
        <Route
          path="/notes"
          element={
            <Protected user={user}>
              <NotesPage />
            </Protected>
          }
        />
        <Route
          path="/ask"
          element={
            <Protected user={user}>
              <AskPage />
            </Protected>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
