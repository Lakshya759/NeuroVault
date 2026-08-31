// AuthPage.jsx — Premium login / signup screen for NeuroVault

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
        await register(name, email, password);
        const data = await login(email, password);
        onLogin(data.data);
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
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🧠</div>
          <div className="auth-logo-name">NeuroVault</div>
          <div className="auth-logo-tagline">Your personal AI-powered knowledge OS</div>
        </div>

        <div className="form-card">
          {/* Mode tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab${mode === "signup" ? " active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Create Account
            </button>
          </div>

          <p className="form-subtitle">
            {isSignup
              ? "Start building your personal knowledge base today."
              : "Welcome back — sign in to access your vault."}
          </p>

          {error && (
            <div className="error-box" role="alert">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="auth-form">
            {isSignup && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
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
              <label htmlFor="auth-email">Email Address</label>
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
              style={{ marginTop: 8 }}
            >
              <span>
                {loading ? <Spinner size="sm" /> : null}
                {loading ? "Please wait…" : isSignup ? "Create account →" : "Sign in →"}
              </span>
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
            {isSignup ? "Sign in" : "Sign up for free"}
          </button>
        </p>
      </div>
    </div>
  );
}
