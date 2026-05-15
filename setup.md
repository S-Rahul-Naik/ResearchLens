# ResearchLens Setup Guide - New Laptop Installation

This guide will help you set up the complete ResearchLens project on a new laptop without any issues.

## Prerequisites

Before starting, ensure you have the following **required** tools installed:

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

### Optional but Recommended:

#### **Ollama** (for local AI features)
- Download from: https://ollama.ai
- Provides offline LLM for gap analysis, chatbot, and report generation
- Alternative: Use OpenAI API or Google Gemini API
- See: [Ollama Setup](#optional-ollama-setup-local-llm)

#### **n8n** (for workflow automation)
- Install: `npm install -g n8n`
- Enables advanced workflow orchestration
- See: [n8n Setup](#optional-n8n-setup)

#### **MongoDB Compass** (GUI for MongoDB)
- Download from: https://www.mongodb.com/products/compass
- Visual database management tool (optional but helpful)

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

### Required Components
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

### Optional Components (for full features)
- [ ] Ollama installed and running (for local AI features)
  - Verify: http://localhost:11434/api/tags returns model list
- [ ] spaCy models downloaded: `python -m spacy download en_core_web_sm`
- [ ] n8n installed and running (for workflow automation)
  - Verify: http://localhost:5678 loads n8n UI
- [ ] OpenAI/Gemini API key configured (if not using Ollama)

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

### Ollama Issues
- **Service not responding**: Ensure `ollama serve` is running
- **Model download fails**: Check internet connection, restart ollama
- **Out of memory**: Use smaller model (orca-mini) or close other applications
- **Port 11434 in use**: Another service using port, change in code or use different port
- **Slow AI responses**: Consider using faster model (neural-chat) or skip AI features

### spaCy Model Issues
- **"Can't find model" error**: Run `python -m spacy download en_core_web_sm`
- **Download fails**: Check internet, try manual download from: https://github.com/explosion/spacy-models/releases
- **Out of space**: Use smaller model (`en_core_web_sm` ~12MB vs `en_core_web_lg` ~560MB)

### AI Features Not Working
- **If using Ollama**: Verify Ollama is running on http://localhost:11434
- **If using OpenAI**: Check `OPENAI_API_KEY` is valid in `.env`
- **If using Gemini**: Check `GEMINI_API_KEY` is set in `.env`
- **Fallback**: System works without AI, but with reduced features

### n8n Connection Issues
- Ensure n8n is running: `n8n start` in separate terminal
- Verify endpoint: http://localhost:5678 should load n8n UI
- Check `N8N_BASE_URL` in backend `.env` is correct
- Look for API key: Configure in N8N_API_KEY in `.env`

## Optional: Ollama Setup (Local LLM)

**Ollama** provides a local, offline large language model (LLM) that powers AI features in ResearchLens like gap analysis summaries, chatbot responses, and report generation.

### Why Ollama?
- ✅ Runs completely offline (no API calls)
- ✅ Free and open-source
- ✅ Faster than cloud APIs
- ✅ No rate limits
- ✅ Private (your data stays local)

### Installation

#### Windows/macOS
1. Download from: https://ollama.ai
2. Install and run the application
3. Verify installation:
   ```bash
   ollama --version
   ```

#### Linux
```bash
curl https://ollama.ai/install.sh | sh
```

### Pulling a Model

```bash
# Pull Ollama model (first time, ~5GB download)
ollama pull mistral

# Or use alternative models:
ollama pull neural-chat      # Smaller, faster (~4GB)
ollama pull llama2           # Meta's Llama (~7GB)
ollama pull orca-mini        # Smaller option (~3GB)
```

### Running Ollama

```bash
# Start Ollama server
ollama serve

# Or run in background (Windows)
ollama serve &

# Test the model
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello, how are you?",
  "stream": false
}'
```

### Configure Backend for Ollama

Update `backend/.env`:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_ENABLED=true

# Alternative: Use OpenAI instead of Ollama
# OPENAI_API_KEY=sk-your-key-here
# LLM_PROVIDER=openai
```

### Verification

- Ollama running: http://localhost:11434/api/tags should list available models
- Model working: Backend can communicate with Ollama for AI features
- Check logs: `npm run dev` should show Ollama connection status

### Troubleshooting Ollama

| Issue | Solution |
|-------|----------|
| **"Connection refused"** | Ensure `ollama serve` is running |
| **Port 11434 in use** | Another service using port. Check: `netstat -ano \| findstr 11434` |
| **Model download stuck** | Check internet connection, restart ollama |
| **Out of memory** | Close other apps, use smaller model: `ollama pull orca-mini` |
| **Slow responses** | Use neural-chat (smaller, faster) or ensure 8GB+ RAM |

### Model Recommendations

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **orca-mini** | ~3GB | ⚡ Fast | Good | Budget/quick analysis |
| **neural-chat** | ~4GB | ⚡ Fast | Very Good | Recommended |
| **mistral** | ~5GB | ⚡ Medium | Excellent | Best quality |
| **llama2** | ~7GB | 🐢 Slow | Excellent | Premium but slower |

---

## Optional: Additional AI Services Setup

### Google Gemini API (Alternative to Ollama)

```env
# In backend/.env
GEMINI_API_KEY=your-gemini-key
LLM_PROVIDER=gemini
```

Setup instructions: See `GEMINI_CREDENTIAL_SETUP.md`

### OpenAI API (Alternative to Ollama)

```env
# In backend/.env
OPENAI_API_KEY=sk-your-key
LLM_PROVIDER=openai
LLM_API_BASE=https://api.openai.com/v1
```

Benefits:
- Best quality responses
- Faster processing
- Enterprise-grade reliability

Costs: Pay per API call (~$0.01-0.10 per analysis)

---

## Optional: spaCy Model Downloads

The Python services use spaCy for NLP. Download language models:

```bash
# Activate Python virtual environment first
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

# Download English model
python -m spacy download en_core_web_sm

# Or larger, more accurate model
python -m spacy download en_core_web_lg
```

**Models:**
- `en_core_web_sm` - Smaller, faster (~12MB)
- `en_core_web_lg` - Larger, more accurate (~560MB)

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

## Feature Availability by Configuration

### Minimum Setup (Required Components Only)
✅ **Works:**
- Paper upload and management
- Topic modeling and analysis
- Gap detection
- Trend analysis
- Research visualizations
- Basic database functionality

❌ **Missing:**
- AI-powered gap summaries & explanations
- Chatbot Q&A
- Automated workflow orchestration (n8n)

### With Ollama (Recommended)
✅ **Adds:**
- AI-generated gap explanations
- Intelligent chatbot responses
- Automated report generation
- Offline LLM features (no API costs)

**Cost:** Free, runs locally
**Performance:** Fast (~5-10 seconds per analysis)

### With n8n
✅ **Adds:**
- Advanced workflow automation
- Parallel processing of modules
- Enhanced error handling
- Scheduled analysis runs

**Cost:** Free (self-hosted), ~500MB disk space
**Performance:** Faster analysis (10-20% improvement)

### With OpenAI/Gemini API (Enterprise Option)
✅ **Adds:**
- Best-quality AI responses
- Faster processing
- More reliable results
- Premium support

**Cost:** ~$0.01-0.50 per analysis
**Performance:** Fastest responses (~2-3 seconds)

---

## Recommended Setup for Your New Laptop

### Scenario 1: Personal Use / Learning
**Install:**
- All required components
- Ollama (free, offline)
- Optional: MongoDB Compass (visual tool)

**Time to setup:** ~30 minutes
**Cost:** $0

### Scenario 2: Production / Team Use
**Install:**
- All required components
- Ollama or OpenAI API
- n8n for workflows
- MongoDB Atlas (cloud)

**Time to setup:** ~1 hour
**Cost:** $0-20/month (depending on usage)

### Scenario 3: Enterprise / High Performance
**Install:**
- All required components
- OpenAI API (best quality)
- n8n (advanced workflows)
- MongoDB Atlas (enterprise)
- Cloudinary (image storage)

**Time to setup:** ~1.5 hours
**Cost:** $50-200+/month (depending on usage)

---

## Environment Variables Summary

### Minimum Required
```env
MONGODB_URI=mongodb://localhost:27017/researchlens
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key
VITE_API_URL=http://localhost:4000
```

### With Ollama (Recommended)
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_ENABLED=true
```

### With n8n (Optional)
```env
N8N_BASE_URL=http://localhost:5678
N8N_ENABLED=true
N8N_API_KEY=your-n8n-key
```

### With OpenAI (Enterprise)
```env
OPENAI_API_KEY=sk-your-key
LLM_PROVIDER=openai
```

---

## Next Steps

After successful installation:

1. **Start the services** (as described in "Running the Project")
2. **Set up Ollama** (recommended):
   - Download from https://ollama.ai
   - Pull model: `ollama pull mistral`
   - Start: `ollama serve`
3. **Configure backend `.env`** for Ollama:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=mistral
   OLLAMA_ENABLED=true
   ```
4. **Download spaCy model**: `python -m spacy download en_core_web_sm`
5. **Review documentation**:
   - `README.md` - Project overview
   - `WORKFLOWS_QUICK_REFERENCE.md` - Analysis pipeline
   - `ANALYSISRESULTS.md` - Understanding results
6. **Test with sample papers**:
   - Upload test PDFs in the frontend UI
   - Run an analysis to verify everything works
7. **Optional: Set up n8n**:
   - `npm install -g n8n`
   - `n8n start`
   - Configure in backend `.env`
   - See `N8N_QUICK_START.md`

---

## Quick Diagnostic Commands

```bash
# Check Node.js and npm
node --version
npm --version

# Check Python
python --version

# Check MongoDB running
mongosh  # If this connects, MongoDB is running

# Check Ollama running
curl http://localhost:11434/api/tags

# Check n8n running
curl http://localhost:5678

# Check backend health
curl http://localhost:4000/health

# Check frontend running
curl http://localhost:5173
```

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
mongosh                          # Start MongoDB shell

# Python
python -m venv venv              # Create virtual environment
source venv/bin/activate         # Activate (Windows: venv\Scripts\activate)
python -m spacy download en_core_web_sm  # Download spaCy model

# Ollama (Local AI)
ollama serve                     # Start Ollama server
ollama pull mistral              # Download Mistral model
ollama pull neural-chat          # Download Neural Chat model
ollama list                      # List installed models

# n8n (Workflow Automation)
npm install -g n8n              # Install n8n globally
n8n start                        # Start n8n server
```

---

**Last Updated:** May 2026
**Project:** ResearchLens v1.0
