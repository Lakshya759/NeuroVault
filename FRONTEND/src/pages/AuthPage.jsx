// AuthPage.jsx — Login / Signup screen
// Toggles between two modes with a single form.
// On success, calls props.onLogin(user) so App.jsx can update auth state.

import { useState } from "react";
import { login, register } from "../api";
import Spinner from "../components/Spinner";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        // Register, then immediately log in to establish the session cookie
        await register(name, email, password);
        const data = await login(email, password);
        onLogin(data.data); // data.data = user object from ApiResponse
      } else {
        const data = await login(email, password);
        onLogin(data.data);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-logo">🧠 Knowledge OS</div>

        <div className="form-card">
          <h1 className="form-title">
            {isSignup ? "Create an account" : "Welcome back"}
          </h1>
          <p className="form-subtitle">
            {isSignup
              ? "Start building your personal knowledge base."
              : "Sign in to continue to your notes."}
          </p>

          {error && <div className="error-box" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} id="auth-form">
            {isSignup && (
              <div className="form-group">
                <label htmlFor="auth-name">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isSignup}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              id="auth-submit"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="auth-toggle">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            id="auth-mode-toggle"
            type="button"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
