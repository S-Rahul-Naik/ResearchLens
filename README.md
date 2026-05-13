# ResearchLens

ResearchLens is a full-stack research intelligence platform for analyzing academic papers. It combines paper ingestion, topic modeling, gap detection, trend analysis, chatbot-style research Q&A, and n8n-based orchestration for automated analysis workflows.

## What It Does

- Upload and manage research papers
- Extract paper text and metadata from PDFs
- Run multi-step research analysis across backend modules
- Generate summaries, topics, gaps, trends, visualizations, and related-work outputs
- Use n8n to orchestrate the full analysis pipeline through a backend bridge
- Store analysis results in MongoDB

## Project Structure

- `backend/` - Express API, MongoDB models, analysis services, and n8n bridge
- `frontend/` - React + TypeScript + Vite dashboard UI
- `workflow.json`, `workflow-ai.json`, `workflow-ai-modular.json` - Importable n8n workflow examples
- `N8N_*.md` - Setup and integration guides for n8n
- `WORKFLOWS_*.md` - Workflow reference documentation

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Multer for uploads
- PDF parsing
- Axios for n8n calls

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts

### Automation
- n8n for workflow orchestration
- OpenAI-compatible AI nodes in workflow variants

## Requirements

- Node.js 20+ recommended
- npm
- MongoDB
- n8n if you want to run the automated analysis flow
- OpenAI API key if your n8n workflow uses OpenAI nodes

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` with values like:

```bash
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/researchlens
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173

N8N_BASE_URL=http://localhost:5678
N8N_ENABLED=true
N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow
N8N_API_KEY=
```

Start the backend:

```bash
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite dev server, usually `http://localhost:5173`.

### 3. n8n

Install and start n8n:

```bash
npm install -g n8n
n8n start
```

n8n runs on `http://localhost:5678`.

## How The n8n Integration Works

The app does not call n8n directly from the browser. The flow is:

1. Frontend sends the analysis request to the backend
2. Backend calls `POST /api/modules/n8n-analysis`
3. Backend checks n8n health through the bridge service
4. Backend sends the paper payload to the n8n webhook
5. n8n runs the configured workflow
6. Backend formats the n8n result and stores it in MongoDB
7. Frontend receives the saved analysis response

### Key Backend Files

- `backend/src/routes/modules.js` - exposes the `POST /api/modules/n8n-analysis` endpoint
- `backend/src/services/n8nBridge.js` - handles n8n webhook calls, health checks, and result formatting
- `backend/src/index.js` - backend entrypoint
- `backend/src/app.js` - Express app setup and route mounting

### Default n8n Settings

- Base URL: `http://localhost:5678`
- Workflow path: `full-analysis-workflow`
- Health check: tries common n8n endpoints before sending a job
- Fallback behavior: returns a 503 if n8n is not available

## Importable n8n Workflows

This repo includes three example workflow files:

- `workflow.json` - HTTP request based workflow
- `workflow-ai.json` - single-agent AI workflow
- `workflow-ai-modular.json` - modular multi-agent AI workflow

The modular workflow is the most flexible example and is the one aligned with the current n8n docs.

## Main API Endpoints

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Analysis
- `POST /api/modules/run-all` - local full analysis
- `POST /api/modules/quick-analysis` - local quick analysis
- `POST /api/modules/n8n-analysis` - n8n-orchestrated analysis

### Data
- `GET /api/corpus`
- `POST /api/corpus`
- `POST /api/corpus/upload-json`
- `POST /api/corpus/upload-pdfs`

## Common Development Commands

### Backend

```bash
cd backend
npm run dev
npm start
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run type-check
```

## n8n Quick Start

1. Start the backend and frontend
2. Start n8n on `http://localhost:5678`
3. Import `workflow-ai-modular.json` or build your own workflow
4. Configure OpenAI credentials in n8n if needed
5. Set `N8N_BASE_URL=http://localhost:5678` in `backend/.env`
6. Set `N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow`
7. Run an analysis from the dashboard

## Troubleshooting

- If the backend cannot reach n8n, verify `N8N_BASE_URL`
- If analysis fails immediately, check that n8n is running and the webhook path matches `full-analysis-workflow`
- If login or saved results fail, confirm MongoDB is running and `MONGODB_URI` is correct
- If frontend requests fail, make sure `VITE_API_BASE_URL` points to the backend

## Notes

- The backend listens on port `4000` by default
- The frontend is a Vite app and typically runs on `5173`
- n8n is optional for local development, but required for the automated orchestration flow
- The project still includes local analysis routes, even though the n8n bridge is the primary integrated flow

## License

No license file was provided in this repository.
