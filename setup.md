# ResearchLens Setup Guide - New Laptop Installation

This guide will help you set up the complete ResearchLens project on a new laptop without any issues.

## Prerequisites

Before starting, ensure you have the following installed:

### 1. **Node.js** (v20+)
- Download from: https://nodejs.org/
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. **Python** (v3.8+)
- Download from: https://www.python.org/
- Verify installation:
  ```bash
  python --version
  ```

### 3. **MongoDB**
- Download Community Edition from: https://www.mongodb.com/try/download/community
- Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas
- Note: MongoDB must be running before starting the backend

### 4. **Git**
- Download from: https://git-scm.com/
- Verify: `git --version`

---

## Installation Steps

### Step 1: Clone/Navigate to Project

```bash
# If cloning fresh
git clone <repository-url>
cd researchlens

# Or navigate to existing project
cd path/to/researchlens
```

### Step 2: Backend Setup

#### 2a. Install Node.js Dependencies
```bash
cd backend
npm install
```

**Dependencies installed:**
- `express` - Web framework
- `mongoose` - MongoDB ORM
- `axios` - HTTP client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin resource sharing
- `multer` - File upload handling
- `cloudinary` - Image storage
- `pdf-parse` - PDF text extraction
- `dotenv` - Environment variables
- `ajv` - Schema validation
- `nodemon` - Development auto-reload

#### 2b. Install Python Dependencies
```bash
# Create a Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

**Python dependencies installed:**
- `bertopic` - Topic modeling
- `keybert` - Keyword extraction
- `spacy` - Natural language processing
- `sentence-transformers` - Semantic embeddings
- `scikit-learn` - Machine learning
- `numpy`, `pandas`, `scipy` - Data processing
- `networkx` - Network analysis
- `umap-learn` - Dimensionality reduction
- `hdbscan` - Clustering
- `joblib` - Parallel processing

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install
```

**Dependencies installed:**
- `react` (v19) - UI framework
- `react-router-dom` - Routing
- `typescript` - Type safety
- `vite` - Build tool
- `tailwindcss` - Styling
- `recharts` - Data visualization
- `lucide-react` - Icons
- `i18next` & `react-i18next` - Internationalization
- `firebase` - Authentication/backend
- `@supabase/supabase-js` - Alternative backend
- `@stripe/react-stripe-js` - Payment processing

---

## Environment Variables Setup

### Backend .env file

Create a `.env` file in the `backend/` directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/researchlens
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/researchlens

# Server Configuration
PORT=4000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-secret-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI/LLM Configuration (optional)
OPENAI_API_KEY=your-openai-key
LLM_API_BASE=https://api.openai.com/v1

# n8n Integration (optional)
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
```

### Frontend .env file

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:4000

# Firebase Configuration (optional)
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Supabase Configuration (alternative, optional)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe Configuration (optional)
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
```

---

## Running the Project

### Terminal 1: Start MongoDB

```bash
# Windows (if installed locally)
mongod

# Or use MongoDB Compass GUI instead
```

### Terminal 2: Start Backend

```bash
cd backend
npm run dev
# Server runs on http://localhost:4000
```

### Terminal 3: Start Frontend

```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Verification Checklist

After installation, verify everything works:

- [ ] Node.js v20+ installed
- [ ] Python v3.8+ installed
- [ ] MongoDB is running
- [ ] All npm dependencies installed (both `backend` and `frontend`)
- [ ] All Python packages installed (`pip list` shows all requirements)
- [ ] Backend `.env` file created with `MONGODB_URI` and `JWT_SECRET`
- [ ] Frontend `.env` file created with `VITE_API_URL`
- [ ] Backend starts without errors: `npm run dev` in `backend/`
- [ ] Frontend starts without errors: `npm run dev` in `frontend/`
- [ ] API responds: http://localhost:4000/health returns `{"ok":true,"service":"researchlens-backend"}`
- [ ] Frontend loads: http://localhost:5173 opens without errors

---

## Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB service is running
- Check `MONGODB_URI` is correct in `.env`
- For Atlas, check IP whitelist and password

### Port Already in Use
- Backend default: 4000
- Frontend default: 5173
- Change in `.env` or environment variables if needed

### Python Package Installation Issues
- Ensure virtual environment is activated
- Try: `pip install --upgrade pip`
- Clear cache: `pip cache purge`
- Reinstall: `pip install -r requirements.txt --force-reinstall`

### Missing Environment Variables
- Copy the `.env` examples above
- Fill in your actual API keys and URLs
- Restart the server after creating `.env`

### Node Module Issues
- Delete `node_modules` folder
- Delete `package-lock.json` (or `yarn.lock`)
- Run `npm install` again

---

## Optional: n8n Setup

If you want to use n8n for workflow automation:

1. Install n8n globally: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Access at: http://localhost:5678
4. Configure n8n API key in backend `.env`

For detailed n8n setup, see: `N8N_QUICK_START.md`

---

## Optional: Development Tools

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- MongoDB for VS Code
- Python
- Prettier
- ESLint
- Thunder Client (API testing)

### Testing Dependencies (optional)
```bash
# Backend
npm install --save-dev jest supertest

# Frontend
npm install --save-dev vitest @testing-library/react
```

---

## Next Steps

After successful installation:

1. Review `README.md` for project overview
2. Check `WORKFLOWS_QUICK_REFERENCE.md` for analysis pipeline
3. Review module documentation in `backend/src/services/`
4. Start with sample paper uploads in the frontend UI

---

## Quick Commands Reference

```bash
# Backend
cd backend && npm run dev        # Start development server
npm install                      # Install dependencies
pip install -r requirements.txt  # Install Python packages

# Frontend
cd frontend && npm run dev       # Start development server
npm run build                    # Build for production
npm run lint                     # Run linter
npm run type-check               # TypeScript type checking

# Database
# Start MongoDB shell
mongosh

# Python
python -m venv venv              # Create virtual environment
source venv/bin/activate         # Activate (Windows: venv\Scripts\activate)
```

---

**Last Updated:** May 2026
**Project:** ResearchLens v1.0
