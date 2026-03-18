# Development Setup Guide
## Running Frontend Locally + Backend/MongoDB/NLP in Docker

This guide explains how to run the project with:
- **Frontend**: Running locally (React dev server)
- **Backend, MongoDB, NLP**: Running in Docker containers

---

## Prerequisites

- **Node.js** (v18+ recommended) installed locally
- **Docker** and **Docker Compose** installed
- **Git** (to clone the repository)

---

## Step 1: Environment Configuration

### Backend Configuration

1. Copy the backend environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and configure:
   ```env
   # MongoDB (Docker container)
   MONGO_URI=mongodb://localhost:27018/career-intelligence

   # JWT Secret (generate a random hex string)
   JWT_SECRET=your_secure_random_hex_secret_here

   # Server port
   PORT=5000

   # NLP Service (Docker container)
   NLP_SERVICE_URL=http://localhost:8000

   # Internal token (must match INTERNAL_TOKEN in docker-compose)
   INTERNAL_TOKEN=changeme

   # Optional: Gemini API key for roadmap enrichment
   GEMINI_API_KEY=

   # Node environment
   NODE_ENV=development

   # Email configuration (leave SMTP_HOST empty for dev)
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   EMAIL_FROM="Career Intelligence" <noreply@career-intelligence.app>

   # Frontend URL
   CLIENT_URL=http://localhost:3000
   ```

### NLP Service Configuration (Optional)

If you need to configure the NLP service:
```bash
cp nlp-service/.env.example nlp-service/.env
```

---

## Step 2: Start Docker Services

Start the backend, MongoDB, and NLP services using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

**What this does:**
- Starts MongoDB on port `27018`
- Starts Backend API on port `5001`
- Starts NLP Service on port `8000`
- Downloads models and dependencies (first run may take 2-3 minutes)

**Check service status:**
```bash
docker-compose -f docker-compose.dev.yml ps
```

**View logs:**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f nlp-service
```

---

## Step 3: Start Frontend Locally

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (first time only):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The React app will start on **http://localhost:3000** and automatically open in your browser.

---

## Verify the Setup

1. **Frontend**: http://localhost:3000 (React dev server)
2. **Backend API**: http://localhost:5001 (Docker)
3. **NLP Service**: http://localhost:8000/health (Docker)
4. **MongoDB**: localhost:27018 (Docker)

### Test the Stack

1. Register a new user at http://localhost:3000/register
2. Check email verification link in console logs (if using Ethereal)
3. Upload a resume and try job comparison

---

## Stopping Services

### Stop Docker services:
```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop frontend:
Press `Ctrl+C` in the terminal running React dev server

### Clean up (remove volumes):
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

## Troubleshooting

### Frontend can't connect to backend
- Verify backend is running: `docker-compose -f docker-compose.dev.yml ps`
- Check backend logs: `docker-compose -f docker-compose.dev.yml logs backend`
- Ensure `frontend/src/api/api.js` has `baseURL: "http://localhost:5001"`

### MongoDB connection errors
- Wait for healthcheck to pass: `docker-compose -f docker-compose.dev.yml ps`
- Check MongoDB logs: `docker-compose -f docker-compose.dev.yml logs mongo`
- Verify port 27018 is not in use: `netstat -ano | findstr :27018`

### NLP service slow to start
- First run downloads ~90MB model (normal)
- Check logs: `docker-compose -f docker-compose.dev.yml logs nlp-service`
- Wait for healthcheck: up to 2 minutes on first start

### Port conflicts
If ports 3000, 5001, 8000, or 27018 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.dev.yml` and `frontend/src/api/api.js`

---

## Development Workflow

### Making changes to frontend
React dev server auto-reloads on file changes - no restart needed!

### Making changes to backend
```bash
# Rebuild and restart backend container
docker-compose -f docker-compose.dev.yml up -d --build backend
```

### Making changes to NLP service
```bash
# Rebuild and restart NLP container
docker-compose -f docker-compose.dev.yml up -d --build nlp-service
```

### Accessing MongoDB directly
```bash
# Using mongosh CLI
mongosh mongodb://localhost:27018/career-intelligence

# Or use MongoDB Compass GUI
# Connection string: mongodb://localhost:27018
```

---

## Hot Tips

- **Fast iteration on frontend**: Changes reflect instantly with React hot reload
- **Backend logs**: Keep logs visible: `docker-compose -f docker-compose.dev.yml logs -f backend`
- **Database inspection**: Use MongoDB Compass for visual DB management
- **Clean slate**: Run `docker-compose -f docker-compose.dev.yml down -v` to reset database

---

## Production Setup

For full production deployment with all services in Docker, use:
```bash
docker-compose up -d
```

This uses the original `docker-compose.yml` file with all 4 services containerized.
