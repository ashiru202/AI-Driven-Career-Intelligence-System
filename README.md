# AI-Driven Career Intelligence System

A full-stack MERN application with AI-powered career guidance, resume analysis, skill gap detection, and personalized learning roadmaps.

## 🚀 Features

### Core Functionality
- ✅ **Resume Analysis**: Upload PDF/DOCX resumes and extract skills using NLP
- ✅ **Job Comparison**: Compare your skills against job requirements
- ✅ **Skill Gap Analysis**: Identify missing skills with match score percentage
- ✅ **Learning Roadmaps**: Generate personalized learning paths with resources
- ✅ **Progress Tracking**: Track your learning progress with status updates

### User Management
- ✅ **Role-Based Access Control (RBAC)**: USER, STAFF, ADMIN roles
- ✅ **JWT Authentication**: Secure token-based auth with 7-day expiry
- ✅ **Account Management**: Admin can enable/disable accounts
- ✅ **Staff Creation**: Admin can create STAFF accounts

### UI/UX
- ✅ **Modern Design**: Tailwind CSS + shadcn/ui components
- ✅ **Role-Based Navigation**: Dynamic sidebar based on user role
- ✅ **Responsive Layout**: Mobile-friendly design
- ✅ **Health Monitoring**: Real-time system health checks

## 📋 Technology Stack

### Frontend
- **React** 18.2
- **React Router** v6
- **Axios** for API calls
- **Tailwind CSS** for styling
- **shadcn/ui** components

### Backend
- **Node.js** + **Express**
- **MongoDB** with Mongoose
- **JWT** authentication
- **bcryptjs** for password hashing
- **Zod** for validation
- **Multer** for file uploads
- **pdf-parse** & **mammoth** for text extraction

### NLP Microservice (Separate)
- **FastAPI** (Python)
- **spaCy** for NLP
- Endpoints: `/health`, `/extract-skills`

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (running locally or cloud)
- Python 3.8+ (for NLP service)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Update the values:
     ```env
     MONGO_URI=mongodb://localhost:27017/career-intelligence
     JWT_SECRET=your_secure_jwt_secret_here
     PORT=5000
     NLP_SERVICE_URL=http://localhost:8000
     NODE_ENV=development
     ```

4. **Start the backend**:
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend**:
   ```bash
   npm start
   ```
   Frontend will run on `http://localhost:3000`

### NLP Service Setup

> **Note**: The NLP service should be running in a separate VS Code window

1. **Ensure FastAPI service has these endpoints**:
   - `GET /health` - Returns `{"ok": true, "service": "nlp"}`
   - `POST /extract-skills` - Accepts `{"text": "..."}` and returns `{"skills": [...]}`

2. **Start the NLP service** on port 8000

## 📁 Project Structure

```
AI-Driven-Career-Intelligence-System/
├── backend/                  # Node/Express API + tests
├── frontend/                 # React app
├── extension/                # Browser extension
├── nlp-service/              # FastAPI NLP microservice
├── docs/                     # Project docs/plans
├── tools/                    # Root-level maintenance utilities
│   ├── check_emojis.py
│   └── fix-paths.js
├── logs/                     # Local runtime/debug logs
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md

backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── scripts/
├── tests/
└── uploads/

frontend/
├── src/
│   ├── api/
│   ├── auth/
│   ├── components/
│   ├── context/
│   └── pages/
└── public/

extension/
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── shared/
└── tests/

nlp-service/
├── scrapers/
├── evaluation/
└── tests/
```

## 🔐 User Roles

### USER (Job Seeker)
- Upload and analyze resume
- Compare skills with job descriptions
- Generate personalized learning roadmaps
- Track learning progress

### STAFF
- View all users
- Access user analytics
- Generate reports (planned)

### ADMIN
- All STAFF permissions
- Create STAFF accounts
- Manage users (enable/disable)
- View system analytics
- Access admin dashboard

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Health
- `GET /api/health` - Check system health (MongoDB + NLP)

### Resumes (USER only)
- `POST /api/resumes/upload` - Upload and analyze resume
- `GET /api/resumes` - Get user's resumes
- `GET /api/resumes/:id` - Get resume details
- `DELETE /api/resumes/:id` - Delete resume

### Comparisons (USER only)
- `POST /api/comparisons/compare` - Compare with job
- `GET /api/comparisons` - Get comparison history
- `GET /api/comparisons/:id` - Get comparison details

### Roadmaps (USER only)
- `POST /api/roadmaps-new` - Create roadmap
- `GET /api/roadmaps-new` - Get user's roadmaps
- `GET /api/roadmaps-new/:id` - Get roadmap details
- `PATCH /api/roadmaps-new/:id/skills` - Update skill status
- `DELETE /api/roadmaps-new/:id` - Delete roadmap

### Admin (ADMIN only)
- `POST /api/admin/staff` - Create staff account
- `GET /api/admin/users` - List users (with filters)
- `PATCH /api/admin/users/:userId/status` - Enable/disable user
- `GET /api/admin/stats` - Get admin stats

## 🎯 Usage Flow

1. **Register/Login**: Create account as USER
2. **Upload Resume**: Go to Resume Analyze page
3. **Compare Job**: Paste job description to get match score
4. **Generate Roadmap**: Click "Generate Roadmap" from comparison results
5. **Track Progress**: Update skill status as you learn

## 🔄 API Response Format

### Success Response
```json
{
  "ok": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "Optional details"
  }
}
```

## 🧪 Testing

### Check System Health
1. Start MongoDB, Backend, and NLP service
2. Visit: `http://localhost:3000/health`
3. Verify all services show "OK"

### Test Complete Flow
1. Register as USER
2. Upload a sample resume (PDF/DOCX)
3. Paste a job description
4. Generate a roadmap
5. Update skill statuses

## 🔧 Development

### Adding New Features
1. Create model in `backend/src/models/`
2. Create controller in `backend/src/controllers/`
3. Create routes in `backend/src/routes/`
4. Register routes in `server.js`
5. Create frontend page in `frontend/src/pages/`
6. Add route in `App.js`

### Code Standards
- Use async/await with asyncHandler
- Use AppError for errors
- Use successResponse/errorResponse helpers
- Validate requests with Zod schemas
- Protect routes with requireAuth and requireRole

## 🚧 Upcoming Features (Phases 7-11)

- **Analytics Engine**: Skill demand trends, common gaps
- **Staff Dashboard**: User analysis workspace
- **Admin Dashboard**: Platform overview widgets
- **Report Generation**: PDF/JSON export
- **Security Hardening**: Rate limiting, input sanitization
- **Testing**: Automated tests for core flows
- **Deployment Documentation**: Production setup guide

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `PORT` | Backend server port | 5000 |
| `NLP_SERVICE_URL` | NLP microservice URL | http://localhost:8000 |
| `NODE_ENV` | Environment | development |

## 🤝 Contributing

This is an academic project. For improvements:
1. Follow existing code patterns
2. Test thoroughly
3. Update documentation

## 📄 License

Academic Project - All rights reserved

## 👤 Author

Built as part of AI-Driven Career Intelligence System project

---

**Note**: Ensure MongoDB and NLP services are running before starting the application.
