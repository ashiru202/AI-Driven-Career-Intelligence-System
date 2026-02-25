# 🚀 Starting the Project

You need **3 terminals** open. Start them in this exact order.

---

## Terminal 1 — NLP Service (Python)

```bash
cd nlp-service
../.venv/Scripts/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> ✅ Ready when you see: `Uvicorn running on http://0.0.0.0:8000`
> ⚠️ First startup downloads the AI model (~90MB) — takes ~15–20 seconds. Subsequent starts are instant.

---

## Terminal 2 — Backend (Node.js)

```bash
cd backend
npm run dev
```

> ✅ Ready when you see: `Server running on port 5000`

---

## Terminal 3 — Frontend (React)

```bash
cd frontend
npm start
```

> ✅ Ready when your browser opens at `http://localhost:3000`

---

## Health Check

Once all 3 are running, verify everything is working:

```
http://localhost:5000/api/health
```

Expected response:
```json
{
  "ok": true,
  "db":  { "ok": true },
  "nlp": { "ok": true }
}
```

---

## Quick Reference

| Service  | URL                          | Port |
|----------|------------------------------|------|
| Frontend | http://localhost:3000         | 3000 |
| Backend  | http://localhost:5000         | 5000 |
| NLP API  | http://localhost:8000         | 8000 |
| NLP Docs | http://localhost:8000/docs    | 8000 |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `NLP service DOWN` on health page | Start Terminal 1 first, wait for ready message |
| `Cannot connect to MongoDB` | Make sure MongoDB is running locally |
| Frontend shows blank page | Wait for backend to fully start first |
| NLP model download fails | Check internet connection — model only downloads once |
| Port already in use | Kill the old process: `npx kill-port 5000` or `npx kill-port 8000` |
