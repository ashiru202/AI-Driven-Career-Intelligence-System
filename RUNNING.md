# Running the Project

This guide covers running the project in **hybrid mode**: frontend locally with `npm start`, and backend + NLP service + MongoDB via Docker.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js + npm installed
- Project `.env` files configured:
  - `backend/.env` (copy from `backend/.env.example` and fill in your keys)
  - `nlp-service/.env` (optional)

---

## Step 1 — Start Docker Services

From the **project root**, start MongoDB, the NLP service, and the backend:

```bash
docker compose up mongo nlp-service backend -d
```

> **First run:** Docker will build the images and the NLP service will download the ~90 MB transformer model. This can take a few minutes. Subsequent starts are fast due to caching.

Check that all services are healthy before proceeding:

```bash
docker compose ps
```

All three services should show `healthy` or `running`.

---

## Step 2 — Start the Frontend

In a **separate terminal**, from the project root:

```bash
cd frontend
npm start
```

The React app will be available at `http://localhost:3000`.

---

## Ports

| Service     | URL                        |
|-------------|----------------------------|
| Frontend    | http://localhost:3000      |
| Backend API | http://localhost:5001      |
| NLP Service | http://localhost:8000      |
| MongoDB     | Internal Docker network only |

---

## Useful Commands

| Action                        | Command                                              |
|-------------------------------|------------------------------------------------------|
| View backend logs             | `docker compose logs -f backend`                     |
| View NLP service logs         | `docker compose logs -f nlp-service`                 |
| View all logs                 | `docker compose logs -f`                             |
| Stop all Docker services      | `docker compose down`                                |
| Stop and remove volumes       | `docker compose down -v`                             |
| Rebuild after code changes    | `docker compose up --build mongo nlp-service backend -d` |

---

## Notes

- The backend container maps host port `5001` → container port `5000`.
- CORS is pre-configured to allow `http://localhost:3000`.
- Resume uploads are persisted in the `backend_uploads` Docker volume across restarts.
- The HuggingFace model is cached in the `huggingface_cache` Docker volume — it will not be re-downloaded on restart.
