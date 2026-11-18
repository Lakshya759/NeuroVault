<p align="center">
  <img src="./FRONTEND/src/assets/hero.png" alt="NeuroVault" width="120" />
</p>

<h1 align="center">🧠 NeuroVault — Personal Knowledge OS</h1>

<p align="center">
  <strong>An AI-powered knowledge management platform that transforms scattered information into retained, searchable knowledge.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Voyage-AI-7C3AED" alt="Voyage AI" />
  <img src="https://img.shields.io/badge/Supabase-Storage-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
</p>

---

## 📌 What is NeuroVault?

Modern learners consume information from articles, PDFs, videos, documentation, and personal notes — but it stays scattered across tabs, bookmarks, and folders. **NeuroVault** solves this by being a single AI-powered platform where you can:

- **Capture** knowledge from PDFs and manual text notes
- **Organize** it automatically in a structured knowledge vault
- **Retrieve** anything instantly through natural language search
- **Ask AI** questions grounded in *your own* saved content
- **Discover** connections between concepts across your knowledge base

> The goal is not simply to store information, but to transform scattered content into long-term, reusable knowledge.

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><strong>🔐 Authentication</strong></td>
    <td align="center"><strong>📥 Ingest Knowledge</strong></td>
  </tr>
  <tr>
    <td><img src="./screenshots/auth.png" alt="Auth Page" width="100%"/></td>
    <td><img src="./screenshots/ingest.png" alt="Ingest Page" width="100%"/></td>
  </tr>
  <tr>
    <td align="center"><strong>📝 Knowledge Vault</strong></td>
    <td align="center"><strong>✨ Ask AI</strong></td>
  </tr>
  <tr>
    <td><img src="./screenshots/notes.png" alt="Notes Page" width="100%"/></td>
    <td><img src="./screenshots/ask.png" alt="Ask AI Page" width="100%"/></td>
  </tr>
</table>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **PDF Ingestion** | Upload PDFs — text is extracted, chunked, and embedded asynchronously via BullMQ |
| 📝 **Text Notes** | Write or paste notes directly into your vault |
| 🔍 **Semantic Search** | Vector similarity search powered by pgvector and Voyage AI embeddings |
| 🤖 **AI Q&A (RAG)** | Ask questions grounded in your saved content with Gemini AI — sources cited |
| 💬 **Conversation History** | Named chat sessions with full history, persisted per user |
| 📊 **Knowledge Dashboard** | Stat cards, recently added notes, and most-asked topics at a glance |
| 🔐 **JWT Auth** | Secure cookie-based authentication with bcrypt password hashing |
| 📡 **Job Status Polling** | Real-time PDF processing status via BullMQ job tracking |
| 📱 **Responsive UI** | Mobile-first design with hamburger drawer navigation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  /auth  │  /ingest  │  /notes  │  /ask                      │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST API (HTTP cookies)
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend (Express.js)                       │
│  /api/v0/users  │  /api/v0/material  │  /api/v0/chat        │
└───┬────────────────┬────────────────────┬────────────────────┘
    │                │                    │
    ▼                ▼                    ▼
PostgreSQL       Redis (BullMQ)      Supabase Storage
(pgvector)       Queue + Worker          (PDFs)
    │
    ├── Voyage AI  (text embeddings)
    └── Gemini AI  (RAG answers + text cleaning)
```

### RAG Pipeline

```
User uploads PDF
      ↓
Supabase Storage  ──→  pdf-parse (extract text)
                             ↓
                    Gemini AI (clean text)
                             ↓
                  LangChain TextSplitter (chunk)
                             ↓
                  Voyage AI (embed chunks)
                             ↓
              pgvector (store embeddings in PostgreSQL)
```

When a user asks a question:
1. Query is embedded with Voyage AI
2. Top-k similar chunks are retrieved from pgvector via cosine similarity
3. Context is assembled with conversation memory
4. Gemini AI generates a grounded answer, citing source documents

---

## 📁 Project Structure

```
PKOS/
├── BACKEND/
│   └── src/
│       ├── auth/              # Auth controllers, routes, queries
│       ├── chatBot/           # RAG chat controllers, services, queries
│       ├── upload/            # PDF & text upload controllers, services
│       │   ├── pdf-upload/
│       │   └── text-upload/
│       ├── workers/           # BullMQ PDF processing worker
│       ├── middlewares/       # JWT auth, Multer file handling
│       ├── queues/            # BullMQ queue configuration
│       ├── db/                # PostgreSQL pool, schema
│       └── utils/             # ApiError, ApiResponse, asyncHandler
│
└── FRONTEND/
    └── src/
        ├── pages/
        │   ├── AuthPage.jsx       # Login / Register
        │   ├── IngestionPage.jsx  # PDF upload + text note creation
        │   ├── NotesPage.jsx      # Knowledge Vault viewer + dashboard
        │   └── AskPage.jsx        # AI chat interface
        ├── components/
        │   ├── ChatMessage.jsx    # Chat bubble with vault badge
        │   ├── SourcesPanel.jsx   # Cited sources panel
        │   ├── NoteCard.jsx       # Individual note card
        │   └── Spinner.jsx        # Loading indicator
        ├── hooks/
        │   └── useIngestionStore.js  # localStorage-backed job state
        └── api.js                 # All fetch calls in one place
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** with [pgvector](https://github.com/pgvector/pgvector) extension
- **Redis** (for BullMQ job queue)
- **Supabase** project (for PDF storage)
- API keys for **Voyage AI** and **Google Gemini**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pkos.git
cd pkos
```

### 2. Backend Setup

```bash
cd BACKEND
cp .env.example .env   # Fill in your credentials (see below)
npm install
```

**Environment variables** (`.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pkos
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_BUCKET=pdfs

# AI APIs
VOYAGE_API_KEY=your_voyage_api_key
GEMINI_API_KEY=your_gemini_api_key
```

**Initialize the database schema:**

```bash
psql $DATABASE_URL -f src/db/schema.sql
```

**Start the API server:**

```bash
npm run dev
# Server runs on http://localhost:8000
```

**Start the PDF worker** (separate terminal):

```bash
npm run worker:dev
```

### 3. Frontend Setup

```bash
cd FRONTEND
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v0/users/register` | Register a new user |
| `POST` | `/api/v0/users/login` | Log in and receive session cookie |
| `GET` | `/api/v0/users/logout` | Clear session cookie |
| `GET` | `/api/v0/users/user` | Get current authenticated user |

### Knowledge (Material)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v0/material` | List all notes/materials |
| `POST` | `/api/v0/material/upload` | Create a text note |
| `POST` | `/api/v0/material/upload/pdf` | Upload a PDF (async, returns `jobId`) |
| `GET` | `/api/v0/material/pdf/status/:jobId` | Poll BullMQ job status |

### Chat (RAG)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v0/chat/conversations` | List all conversations |
| `POST` | `/api/v0/chat/conversations` | Create a new conversation |
| `GET` | `/api/v0/chat/conversations/:id` | Get conversation with full turn history |
| `POST` | `/api/v0/chat/conversations/:id/message` | Send a message, receive AI answer |

---

## 🛠️ Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Express.js 5** | REST API framework |
| **PostgreSQL + pgvector** | Relational DB + vector similarity search |
| **Redis + BullMQ** | Async job queue for PDF processing |
| **Supabase Storage** | PDF file storage |
| **Voyage AI** | Text embeddings (`voyage-3-lite`) |
| **Google Gemini** | RAG answer generation + text cleaning |
| **LangChain TextSplitters** | Recursive text chunking |
| **pdf-parse** | PDF text extraction |
| **bcrypt + JWT** | Password hashing + session auth |
| **Multer** | Multipart file upload handling |

### Frontend
| Technology | Role |
|---|---|
| **React 18** | UI library |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **react-markdown + remark-gfm** | Markdown rendering for AI responses |

---

## 🗺️ Roadmap

- [x] PDF ingestion with async processing
- [x] Text note creation
- [x] RAG-based AI Q&A with source citations
- [x] Conversation history & multi-session chat
- [x] Knowledge Vault dashboard
- [ ] Spaced repetition / revision queue
- [ ] Knowledge graph visualization
- [ ] YouTube video ingestion
- [ ] Web article ingestion (URL → content)
- [ ] Confidence scoring & progress tracking
- [ ] Hybrid search (dense + sparse / BM25)
- [ ] Refresh token auth pattern
- [ ] Docker + docker-compose deployment

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ to transform how you learn and retain knowledge.</p>
