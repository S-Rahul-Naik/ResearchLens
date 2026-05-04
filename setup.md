# ResearchLens Setup Guide

A full-stack research intelligence platform with 9 modules for analyzing academic papers using NLP, topic modeling, gap detection, trend analysis, and RAG-powered chatbot.

## System Requirements

- **Node.js**: v20.19+ or v22.12+ (required by Vite 8)
- **Python**: v3.10+ (for PDF parsing and ML models)
- **MongoDB**: v6+ (for data storage)
- **Ollama**: Latest version (for local LLM inference)
- **npm**: v9+

## Prerequisites

1. **Ollama Installation** (Required for RAG Chatbot)
   - Download from: https://ollama.ai
   - Install and run: `ollama serve`
   - Pull the default model: `ollama pull llama3.1:8b`
   - Runs on: `http://127.0.0.1:11434`

   If Vite refuses to start with `CustomEvent is not defined` or warns about Node 18, upgrade Node before continuing. On Windows, the fastest path is to install Node 20 LTS or 22 LTS from nodejs.org, or use `nvm-windows` to switch versions.

2. **MongoDB Setup**
   - Local: `mongod` (ensure MongoDB is running)
   - Cloud: MongoDB Atlas connection string

3. **Environment Variables**
   Create `.env` files for backend and frontend

## Installation

### Clone Repository
```bash
cd researchlens
git clone <repository-url> .
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/researchlens
JWT_SECRET=your-secret-key-here
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_KEY=your-cloudinary-key
CLOUDINARY_SECRET=your-cloudinary-secret
PORT=4000
NODE_ENV=development
EOF

# Start development server
npm run dev
# Server runs on: http://localhost:4000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:4000
EOF

# Start development server
npm run dev
# Frontend runs on: http://localhost:3000
```

## Architecture Overview

### Backend (Express.js)

**9-Module Pipeline:**
1. **Module 1**: PDF Parsing & Summarization
2. **Module 2**: Topic Modeling (UMAP + HDBSCAN)
3. **Module 3**: Gap Detection (Similarity + Co-occurrence)
4. **Module 4**: Trend Analysis (Year-over-year growth)
5. **Module 5**: Research Map Visualization (2D projection)
6. **Module 6**: RAG Chatbot (Ollama + Semantic Search)
7. **Module 7**: Contradiction Detection
8. **Module 8**: Dataset-Method Matrix
9. **Module 9**: Related Work Draft Generation

**Key Services:**
- `/backend/src/services/` - Module implementations
- `/backend/src/routes/` - API endpoints
- `/backend/src/models/` - MongoDB schemas (Paper, User)
- `/backend/src/middleware/` - Authentication & error handling

### Frontend (React + TypeScript + Vite)

**Pages:**
- `/pages/auth/` - Sign in / Sign up
- `/pages/dashboard/` - Main analysis interface
- `/pages/home/` - Landing page

**Sections:**
- Dataset Summary (Section 1)
- Topic Modeling (Section 2)
- Gap Detection (Section 3)
- Trend Analysis (Section 4)
- Research Map (Section 5)
- Chat Results (Section 6)
- Evaluation (Section 7)

**Component Structure:**
- `/src/pages/dashboard/sections/` - Module UI components
- `/src/pages/dashboard/sections/results/` - Analysis report sections
- `/src/hooks/` - Custom React hooks
- `/src/lib/api.ts` - Centralized API client

## Running the Application

### Terminal 1: Start MongoDB (if local)
```bash
mongod
```

### Terminal 2: Start Ollama
```bash
ollama serve
```

### Terminal 3: Start Backend
```bash
cd backend
npm run dev
```

### Terminal 4: Start Frontend
```bash
cd frontend
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Analysis
- `POST /api/modules/run-all` - Execute full 9-module pipeline
- `POST /api/modules/6-chatbot` - Ask question via RAG chatbot

### Data
- `GET /api/corpus` - Get paper corpus
- `POST /api/corpus/upload-pdfs` - Upload PDF files

## Data Flow

### Upload & Processing
1. User uploads PDF papers
2. Backend extracts text, metadata, abstracts
3. Papers stored in MongoDB
4. User clicks "Analyze"

### Analysis Pipeline
1. **Module 1**: Parse PDFs → Extract summaries
2. **Module 2**: Embed abstracts → Cluster into topics
3. **Module 3**: Compute topic similarities → Detect gaps
4. **Module 4**: Track topic counts by year → Detect trends
5. **Module 5**: Project embeddings to 2D → Visualize map
6. **Module 6**: Index paper chunks → Setup RAG
7. **Module 7**: Find contradictions
8. **Module 8**: Extract datasets & methods
9. **Module 9**: Generate related work section

### RAG Chatbot Flow
1. User asks question in chat
2. Backend embeds question
3. Semantic search retrieves top-k paper chunks
4. Chunks + topics/gaps sent to Ollama
5. Ollama generates answer with citations

## Development Workflow

### TypeScript Type Checking
```bash
cd frontend
npm run type-check
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend (no build needed - CommonJS)
```

### Running Tests
```bash
# Add test commands to package.json as needed
```

## Troubleshooting

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf frontend/node_modules
cd frontend
npm install
npm run dev
```

### Backend connection errors
- Check MongoDB is running: `mongod`
- Check Ollama is running: `ollama serve`
- Verify `.env` variables are set
- Check port 4000 is available

### Ollama not responding
```bash
# Ensure Ollama is serving
ollama serve

# Test endpoint
curl http://127.0.0.1:11434/api/tags

# Pull model if needed
ollama pull llama3.1:8b
```

### MongoDB connection failed
```bash
# Check MongoDB is running
mongosh

# If local MongoDB not working, use MongoDB Atlas
# Update MONGODB_URI in .env to Atlas connection string
```

## Key Configuration Files

- `frontend/vite.config.ts` - Vite bundler config
- `frontend/tsconfig.json` - TypeScript config
- `frontend/tailwind.config.ts` - Tailwind CSS config
- `backend/src/db/mongoose.js` - MongoDB connection
- `backend/src/middleware/auth.js` - JWT authentication

## Environment Variables Reference

### Backend (.env)
```
MONGODB_URI         # MongoDB connection string
JWT_SECRET          # Secret key for JWT signing
CLOUDINARY_NAME     # Cloudinary API name
CLOUDINARY_KEY      # Cloudinary API key
CLOUDINARY_SECRET   # Cloudinary API secret
PORT                # Backend server port (default: 4000)
NODE_ENV            # Environment (development/production)
```

### Frontend (.env.local)
```
VITE_API_BASE_URL   # Backend API URL (default: http://localhost:4000)
```

## Features

✅ **PDF Upload & Processing** - Extract text, abstracts, metadata
✅ **Topic Modeling** - UMAP + HDBSCAN clustering with coherence scoring
✅ **Gap Detection** - Semantic similarity + co-occurrence analysis
✅ **Trend Analysis** - Year-over-year growth tracking
✅ **Research Map** - Interactive 2D visualization with topic centers
✅ **RAG Chatbot** - Local Ollama LLM with semantic retrieval
✅ **Analysis Export** - Print, share, snapshot functionality
✅ **User Authentication** - JWT-based auth with profile management

## Performance Optimization

- **Frontend**: Code splitting, lazy loading, Tailwind CSS purging
- **Backend**: Caching strategies, MongoDB indexing, efficient PDF parsing
- **RAG**: Vector caching, semantic search optimization

## Support & Resources

- **Documentation**: See inline code comments and JSDoc
- **API Docs**: Postman collection available (add to repo)
- **Issues**: Create GitHub issues for bugs/features

---

**Last Updated**: May 4, 2026
**Version**: 1.0.0
