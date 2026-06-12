# Patch — Discount Tire IT Support

Self-service IT support chatbot for Discount Tire associates, built with Next.js 16, MongoDB, and Ollama LLM.

## Features

- **Authentication** — Login/Signup with JWT cookies and bcrypt password hashing
- **Chat Interface** — Full conversational UI with markdown rendering and inline images
- **Knowledge Base** — Local Markdown-based KB retrieval from `knowledge_base/workflows/`
- **LLM Integration** — Ollama-based LLM with JSON structured output and parsing pipeline
- **Dynamic Controls** — Inline buttons, select lists, and structured forms driven by the LLM
- **Incident Management** — MongoDB persistence with full history, escalation, and resolution flows
- **Feedback System** — Star rating + comment collected at incident resolution or escalation
- **Resume Chat** — Seamlessly restore prior sessions from the incident detail page

## Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Ollama API access

## Setup

```bash
npm install
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, OLLAMA_BASE_URL, OLLAMA_API_KEY, OLLAMA_MODEL
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name (default: `patch`) |
| `JWT_SECRET` | Secret key for JWT token signing |
| `OLLAMA_BASE_URL` | Ollama API base URL |
| `OLLAMA_API_KEY` | Ollama API bearer token |
| `OLLAMA_MODEL` | Model name (default: `gemma4:31b-cloud`) |

## Knowledge Base

Place Markdown troubleshooting files in `knowledge_base/workflows/` (e.g., `vdi.md`).
Place supporting images in `knowledge_base/images/`.

The application reads KB files at runtime and never writes to this directory.

## Routes

| Route | Description |
|---|---|
| `/` | Main chat interface |
| `/login` | User login |
| `/signup` | User registration |
| `/incidents` | Incident list |
| `/incidents/[id]` | Incident detail and resume |

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4**
- **MongoDB** (native driver)
- **jose** (JWT)
- **bcryptjs** (password hashing)
- **react-markdown** + **remark-gfm** (Markdown rendering)
