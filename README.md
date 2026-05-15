# ResearchLens 🔬📊

**A Comprehensive AI-Powered Research Intelligence Platform**

ResearchLens is a full-stack research intelligence platform that analyzes academic papers using advanced machine learning and AI techniques. It combines paper ingestion, topic modeling, gap detection, trend analysis, chatbot-style research Q&A, and n8n-based workflow orchestration for automated analysis pipelines.

## 🎯 What It Does

ResearchLens helps researchers and academics:

- **Upload & Manage** research papers in PDF format with automatic metadata extraction
- **Extract Knowledge** - Parse paper text, abstracts, metadata, and author information
- **Topic Modeling** - Discover latent topics using BERTopic with semantic embeddings
- **Gap Detection** - Identify research gaps and unexplored areas in your corpus
- **Trend Analysis** - Track emerging topics and research directions over time
- **Chatbot Q&A** - Interactive research assistant for querying your paper corpus
- **Scientific Honesty Evaluation** - Assess methodology soundness and claims validity
- **Visualizations** - Generate interactive charts, networks, and dashboards
- **Workflow Orchestration** - Automate analysis pipelines using n8n

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)              │
│              TypeScript • Tailwind • Recharts           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (Express.js)                    │
│         ┌──────────────────────────────────────┐        │
│         │  API Routes & Authentication         │        │
│         │  • Auth (JWT)                        │        │
│         │  • Modules (Analysis)                │        │
│         │  • Corpus Management                 │        │
│         └──────────────────────────────────────┘        │
│         ┌──────────────────────────────────────┐        │
│         │  Analysis Services (Node.js)         │        │
│         │  • Summarization                     │        │
│         │  • Topic Modeling (Python Bridge)    │        │
│         │  • Gap Detection (Python Bridge)     │        │
│         │  • Trend Detection                   │        │
│         │  • Chatbot                           │        │
│         │  • n8n Orchestration                 │        │
│         └──────────────────────────────────────┘        │
└──────────┬─────────────────┬──────────────────────────────┘
           │                 │
           ▼                 ▼
    ┌──────────────┐  ┌──────────────────┐
    │   MongoDB    │  │ Python Services  │
    │  (Analysis   │  │ • BERTopic       │
    │  Results)    │  │ • spaCy          │
    └──────────────┘  │ • scikit-learn   │
                      └──────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    n8n       │
                      │  (Optional   │
                      │  Workflows)  │
                      └──────────────┘
```

## 📁 Project Structure

```
researchlens/
├── frontend/                     # React TypeScript Vite app
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # API utilities
│   │   ├── mocks/               # Mock data
│   │   ├── i18n/                # Internationalization
│   │   └── App.tsx              # Main app component
│   ├── package.json             # Frontend dependencies
│   └── vite.config.ts           # Vite configuration
│
├── backend/                      # Express.js API
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.js          # Authentication endpoints
│   │   │   └── modules.js       # Analysis module endpoints
│   │   ├── services/            # Business logic
│   │   │   ├── module1Summarization.js
│   │   │   ├── module2TopicModeling.js
│   │   │   ├── module3GapDetection.js
│   │   │   ├── module4TrendDetection.js
│   │   │   ├── module5Visualization.js
│   │   │   ├── module6Chatbot.js
│   │   │   ├── module7ScientificHonesty.js
│   │   │   ├── n8nBridge.js     # n8n integration
│   │   │   ├── pythonBridge.js  # Python service calls
│   │   │   ├── pdfParser.js     # PDF extraction
│   │   │   └── chatbotBridge.js # Chatbot orchestration
│   │   ├── models/              # MongoDB schemas
│   │   │   ├── User.js
│   │   │   ├── Paper.js
│   │   │   └── AnalysisReport.js
│   │   ├── middleware/          # Express middleware
│   │   │   └── auth.js          # JWT verification
│   │   ├── db/                  # Database connection
│   │   │   └── mongoose.js
│   │   ├── app.js               # Express app setup
│   │   └── index.js             # Server entry point
│   ├── python/                  # Python analysis services
│   │   ├── topic_modeling_cli.py
│   │   ├── gap_detection_cli.py
│   │   ├── topic_engine.py
│   │   ├── gap_engine.py
│   │   └── README.md            # Python service docs
│   ├── package.json             # Backend dependencies
│   ├── requirements.txt         # Python dependencies
│   └── test-*.js                # Test files
│
├── setup.md                      # **Complete setup guide** (NEW)
├── README.md                     # This file
├── N8N_QUICK_START.md           # n8n setup guide
├── N8N_SETUP_GUIDE.md           # Detailed n8n configuration
├── N8N_LLM_PROMPTS.md           # n8n LLM prompt templates
├── WORKFLOWS_QUICK_REFERENCE.md # Workflow usage guide
└── *.json                        # Example n8n workflow files
```

## 💻 Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| Express | 4.19.2 | Web framework |
| MongoDB | Latest | Primary database |
| Mongoose | 9.6.1 | MongoDB ODM |
| Multer | 2.0.2 | File uploads |
| JWT | 9.0.3 | Authentication |
| pdf-parse | 2.4.5 | PDF text extraction |
| Axios | 1.16.0 | HTTP client |
| Cloudinary | 1.41.3 | Image storage |
| Bcryptjs | 3.0.3 | Password hashing |
| Dotenv | 17.4.2 | Environment variables |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.2 | UI framework |
| TypeScript | ~5.8.3 | Type safety |
| Vite | 8.0.1 | Build tool & dev server |
| Tailwind CSS | 3.4.17 | Styling |
| React Router | 7.6.3 | Routing |
| Recharts | 3.2.0 | Data visualization |
| Lucide React | 0.469.0 | Icon library |
| i18next | 25.3.2 | Internationalization |
| Firebase | 12.0.0 | Auth/backend (optional) |
| Supabase | 2.57.4 | Backend alternative (optional) |
| Stripe | 4.0.2 | Payments (optional) |

### Python Services
| Package | Purpose |
|---------|---------|
| BERTopic | Topic modeling & clustering |
| KeyBERT | Keyword extraction |
| sentence-transformers | Semantic embeddings |
| spaCy | NLP & entity extraction |
| scikit-learn | ML algorithms |
| networkx | Network analysis |
| numpy, pandas, scipy | Data processing |
| umap-learn | Dimensionality reduction |
| hdbscan | Hierarchical clustering |
| joblib | Parallel processing |

### Automation
- **n8n** - Workflow orchestration (optional but recommended)
- **OpenAI/LLM APIs** - AI-powered analysis (optional)

## 📋 Core Features & 10 Analysis Modules

### Module 1: 📝 Summarization
- Extractive & abstrac7ve summarization
- Multi-level summaries (paper, section, abstract)
- Keywords and key findings extraction
- Supports different summary lengths

### Module 2: 🏷️ Topic Modeling
- BERTopic-based topic discovery
- Semantic embedding clustering
- Topic coherence scoring
- Dynamic topic labeling with keywords
- Representative paper selection per topic

### Module 3: 🔍 Gap Detection
- Identifies unexplored research areas
- Analyzes topic coverage across corpus
- Suggests emerging research directions
- Outputs confidence-scored gaps

### Module 4: 📈 Trend Detection
- Tracks research trends over time
- Temporal analysis of topics
- Emerging vs. established topics
- Trend velocity and direction

### Module 5: 📊 Visualization
- Interactive dashboards
- Topic networks and relationships
- Temporal evolution charts
- Citation patterns
- Data-driven visual summaries

### Module 6: 💬 Chatbot Q&A
- Context-aware research assistant
- Retrieval-augmented generation (RAG)
- Multi-turn conversations
- Citation tracking
- Answer confidence scoring

### Module 7: ✅ Scientific Honesty
- Evaluates methodology soundness
- Assesses claim validity
- Checks for overgeneralization
- Identifies potential biases
- Provides improvement suggestions

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20+ ([Download](https://nodejs.org/))
- **Python** v3.8+ ([Download](https://www.python.org/))
- **MongoDB** (Local or [Atlas Cloud](https://www.mongodb.com/cloud/atlas))
- **Git**

### Installation

**For complete setup instructions, see [setup.md](setup.md)** ⭐

Quick summary:

```bash
# 1. Backend setup
cd backend
npm install
pip install -r requirements.txt
echo "MONGODB_URI=mongodb://localhost:27017/researchlens
PORT=4000
JWT_SECRET=your-secret-key-here" > .env

# 2. Frontend setup
cd ../frontend
npm install
echo "VITE_API_URL=http://localhost:4000" > .env

# 3. MongoDB (ensure running)
mongod  # or use MongoDB Compass

# 4. Start services in separate terminals
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

**Backend:** http://localhost:4000  
**Frontend:** http://localhost:5173

## 📚 API Documentation

### Authentication Endpoints

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response:** `{ id, email, token }`

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response:** `{ id, email, token }`

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```
**Response:** `{ id, email, createdAt }`

### Analysis Endpoints

#### Run Full Analysis (Local)
```http
POST /api/modules/run-all
Authorization: Bearer <token>
Content-Type: application/json

{
  "papers": [
    {
      "id": "P1",
      "title": "Paper Title",
      "abstract": "...",
      "content": "...",
      "authors": ["Author Name"],
      "year": 2024
    }
  ]
}
```
**Response:** `{ analysisId, results: { module1, module2, ... module10 } }`

#### Run n8n Analysis (Orchestrated)
```http
POST /api/modules/n8n-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "papers": [...],
  "workflow": "full-analysis-workflow"
}
```
**Response:** `{ analysisId, status, results }`

#### Quick Analysis
```http
POST /api/modules/quick-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "papers": [...]
}
```
**Response:** Faster results (subset of full analysis)

### Corpus Endpoints

#### Get Corpus
```http
GET /api/corpus
Authorization: Bearer <token>
```
**Response:** `{ papers: [...], count, totalSize }`

#### Add Papers to Corpus
```http
POST /api/corpus
Authorization: Bearer <token>
Content-Type: application/json

{
  "papers": [...]
}
```

#### Upload PDF Files
```http
POST /api/corpus/upload-pdfs
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: [paper1.pdf, paper2.pdf, ...]
```

#### Upload JSON Corpus
```http
POST /api/corpus/upload-json
Authorization: Bearer <token>
Content-Type: application/json

{
  "papers": [...]
}
```

## 🗄️ Database Models

### User Schema
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Paper Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  abstract: String,
  content: String,
  authors: [String],
  year: Number,
  url: String,
  source: String,
  uploadedAt: Date,
  metadata: Object
}
```

### AnalysisReport Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  paperIds: [ObjectId],
  analysisType: String, // "full", "quick", "n8n"
  results: {
    module1: Object,    // Summarization
    module2: Object,    // Topic Modeling
    module3: Object,    // Gap Detection
    module4: Object,    // Trend Detection
    module5: Object,    // Visualization
    module6: Object,    // Chatbot
    module7: Object    // Scientific Honesty
  },
  status: String,       // "pending", "completed", "failed"
  createdAt: Date,
  completedAt: Date
}
```

## 🛠️ Development Workflow

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development
npm test

# Check code quality (if configured)
npm run lint
```

**Main Files to Modify:**
- `src/routes/modules.js` - Add new API endpoints
- `src/services/moduleX*.js` - Implement analysis logic
- `src/models/` - Update database schemas

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview
```

**Main Files to Modify:**
- `src/pages/` - Add new page components
- `src/hooks/` - Create custom hooks
- `src/lib/api.ts` - API client methods
- `src/App.tsx` - Update routing

### Python Services Development

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install/update packages
pip install -r requirements.txt

# Test Python CLI directly
python python/topic_modeling_cli.py < test_input.json

# Run gap detection
python python/gap_detection_cli.py < test_input.json
```

## 🔌 n8n Integration

### Enable n8n Orchestration

1. **Install n8n:**
   ```bash
   npm install -g n8n
   ```

2. **Start n8n:**
   ```bash
   n8n start
   # Runs on http://localhost:5678
   ```

3. **Configure backend `.env`:**
   ```env
   N8N_BASE_URL=http://localhost:5678
   N8N_ENABLED=true
   N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow
   N8N_API_KEY=your-n8n-api-key
   ```

4. **Import workflow:**
   - Open n8n UI at http://localhost:5678
   - Import `workflow-ai-modular.json`
   - Configure OpenAI/LLM credentials
   - Test the workflow

5. **Use n8n analysis:**
   ```bash
   POST /api/modules/n8n-analysis
   ```

### Workflow Examples

- **workflow.json** - Basic HTTP request workflow
- **workflow-ai.json** - Single-agent AI workflow
- **workflow-ai-modular.json** - Multi-agent modular workflow ⭐ (recommended)

See [N8N_QUICK_START.md](N8N_QUICK_START.md) for detailed guide.

## 📁 Environment Variables

### Backend `.env`
```env
# Server
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/researchlens

# Authentication
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# File Storage
CLOUDINARY_CLOUD_NAME=your-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# LLM/AI
OPENAI_API_KEY=sk-...
LLM_API_BASE=https://api.openai.com/v1

# n8n (Optional)
N8N_BASE_URL=http://localhost:5678
N8N_ENABLED=true
N8N_API_KEY=your-n8n-key
```

### Frontend `.env`
```env
# API
VITE_API_URL=http://localhost:4000

# Firebase (optional)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...

# Supabase (optional)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Stripe (optional)
VITE_STRIPE_PUBLIC_KEY=...
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB connection failed** | Ensure MongoDB is running. Check `MONGODB_URI` in `.env`. For Atlas, verify IP whitelist. |
| **Port 4000 already in use** | Change `PORT` in `.env` or kill the process using: `netstat -ano \| findstr 4000` (Windows) |
| **Port 5173 already in use** | Vite will try 5174, 5175, etc. Or kill the process. |
| **"Cannot find module" errors** | Run `npm install` in the respective directory (backend or frontend) |
| **Python package errors** | Activate venv, then `pip install -r requirements.txt --force-reinstall` |
| **n8n connection failed** | Verify `N8N_BASE_URL` is correct and n8n is running on http://localhost:5678 |
| **JWT authentication failing** | Check `JWT_SECRET` is set and the same in backend `.env` |
| **CORS errors in console** | Verify `CORS_ORIGIN` includes your frontend URL |
| **PDF upload fails** | Check file size (<50MB recommended), ensure Multer is configured |
| **Analysis takes too long** | Check MongoDB indexes are created, Python services are running, consider using quick-analysis |

## 📖 Documentation

- **[setup.md](setup.md)** - Complete setup guide for new installations ⭐
- **[N8N_QUICK_START.md](N8N_QUICK_START.md)** - Get n8n running in 5 minutes
- **[N8N_SETUP_GUIDE.md](N8N_SETUP_GUIDE.md)** - Detailed n8n configuration
- **[WORKFLOWS_QUICK_REFERENCE.md](WORKFLOWS_QUICK_REFERENCE.md)** - Workflow usage guide
- **[backend/python/README.md](backend/python/README.md)** - Python services documentation
- **[DASHBOARD_COMPONENTS_GUIDE.md](frontend/DASHBOARD_COMPONENTS_GUIDE.md)** - Frontend components reference

## 🚢 Deployment

### Deploy Backend

**Option 1: Heroku**
```bash
heroku login
heroku create researchlens-api
git push heroku main
```

**Option 2: DigitalOcean / AWS / Azure**
- Build Docker image: `docker build -t researchlens-backend .`
- Push to registry and deploy

**Environment Variables Needed:**
- `MONGODB_URI` (use production MongoDB Atlas URI)
- `JWT_SECRET` (use strong random key)
- `NODE_ENV=production`
- `CORS_ORIGIN` (set to production frontend URL)

### Deploy Frontend

**Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

**Netlify**
- Connect GitHub repo
- Build command: `npm run build`
- Publish directory: `dist`

**Environment Variables:**
- `VITE_API_URL` (set to production backend URL)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and commit: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📄 License

[Add your license here]

## 👥 Authors

**ResearchLens Development Team**

- Backend/Architecture
- Frontend/UI Design
- Python Services/ML

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in the `*.md` files
- Review [setup.md](setup.md) for common setup problems
- The project still includes local analysis routes, even though the n8n bridge is the primary integrated flow

## License

No license file was provided in this repository.
