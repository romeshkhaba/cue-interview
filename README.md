# Cue — Interview Assistant

AI-powered interview assistant that transcribes questions and streams answers in real time.

## Structure

```
├── backend/   — Go (Gin) API server
└── frontend/  — React + Vite UI
```

## Backend

```bash
cd backend
cp .env.example .env   # add OPENAI_API_KEY
go run .
```

Runs on `http://localhost:8080`.

## Frontend

```bash
cd frontend
npm install
npm run dev            # dev server on http://localhost:5173 (proxies /api to :8080)
npm run build          # production build → frontend/dist/
```

## Environment variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (required) |

## Deploy

- **Frontend** → Vercel (set root directory to `frontend/`)
- **Backend** → Railway / Render / Fly.io (set root directory to `backend/`)
