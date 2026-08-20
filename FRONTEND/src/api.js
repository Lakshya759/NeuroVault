// api.js — all fetch calls in one place
// Auth is handled via HttpOnly cookies; no manual token management needed.

const BASE = "http://localhost:8000/api/v0";

// Helper: fires a fetch and returns parsed JSON.
// Throws an Error with the server's message on non-2xx responses.
async function request(method, path, body) {
  const opts = {
    method,
    credentials: "include", // send the HttpOnly cookie on every request
    headers: {},
  };

  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function register(name, email, password) {
  return request("POST", "/users/register", { name, email, password });
}

export function login(email, password) {
  return request("POST", "/users/login", { email, password });
}

export function logout() {
  return request("GET", "/users/logout");
}

// Returns the current user from the session cookie, or throws if unauthenticated
export function getUser() {
  return request("GET", "/users/user");
}

// ── Notes (material) ──────────────────────────────────────────────────────────

export function getNotes() {
  return request("GET", "/material");
}

export function createNote(title, content) {
  return request("POST", "/material/upload", { title, content });
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export function getAllConversations() {
  return request("GET", "/chat/conversations");
}

export function createConversation(title = "New Chat") {
  return request("POST", "/chat/conversations", { title });
}

export function getConversation(id) {
  return request("GET", `/chat/conversations/${id}`);
}

export function sendMessage(conversationId, question) {
  return request("POST", `/chat/conversations/${conversationId}/message`, {
    question,
  });
}
