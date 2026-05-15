# N8N Integration Setup - Complete Guide

## What Changed

The app no longer shows the old quick/full pipeline picker. Analysis now goes through the backend n8n bridge, which can call a full-analysis workflow in n8n.

## Current Status

✅ **Completed:**
- Removed pipeline selection dialog from frontend
- Created n8n bridge service (`backend/src/services/n8nBridge.js`)
- Created `/api/modules/n8n-analysis` endpoint
- Frontend now calls the backend n8n-analysis endpoint
- Created comprehensive N8N workflow guide

⏳ **Next Steps:**
1. Wait for n8n installation to complete
2. Start n8n locally
3. Create n8n workflows
4. Configure environment variables
5. Test the integration

## Installation Steps

### Step 1: Complete N8N Installation

N8N installation via npm is in progress. Wait for it to complete:

```bash
npm install -g n8n
```

Once done, you'll be able to run `n8n` as a global command.

### Step 2: Start N8N Locally

After installation completes, open a new terminal and run:

```bash
n8n start
```

This will:
- Start the n8n instance on `http://localhost:5678`
- Create a local SQLite database for workflows
- Wait for you to complete the setup wizard

### Step 3: Initial N8N Setup

When you visit `http://localhost:5678`:

1. **Create Admin Account**
   - Email: your-email@example.com
   - Password: strong-password
   
2. **Configure Credentials**
   - Go to Settings → Credentials
   - Add **OpenAI** credential (for LLM calls)
     - API Key: Your OpenAI API key
   - May need additional credentials later

### Step 4: Set Environment Variables

Add to `backend/.env`:

```bash
# N8N Configuration
N8N_BASE_URL=http://localhost:5678
N8N_ENABLED=true
N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow
N8N_API_KEY=  # Optional - leave empty if n8n is local
```

### Step 5: Create N8N Workflows

You need to create the following workflows in N8N:

#### Workflow 1: "full-analysis-workflow" (Master Workflow)

This is the main workflow that orchestrates all 10 modules.

**Trigger:** Webhook (POST)

**Nodes:**

1. **Webhook** - Listen for POST requests
   - Set path: `full-analysis-workflow`
   - Accept: POST

2. **Extract Input Data**
   - Get papers array from request body

3. **Loop Through Papers** - Process each paper

4. **Call All Modules In Sequence:**
   - For each section below, call an HTTP node or code node

5. **Return Response** - Send all results back as JSON

**Expected Input:**
```json
{
  "papers": [
    {
      "id": "paper_id",
      "title": "string",
      "abstract": "string",
      "content": "string",
      "authors": ["string"],
      "year": 2024
    }
  ],
  "question": "What are the key findings?"
}
```

**Expected Output:**
```json
{
  "status": "success",
  "module1": { "summaries": [...] },
  "module2": { "topics": [...], "assignments": [...] },
  "module3": { "gaps": [...] },
  "module4": { "trends": [...] },
  "module5": { "visualization": {...} },
  "module6": { "gapEvidences": [...] },
  "module7": { "honestyScore": 0.85 },
  "reportTitle": "string",
  "reportSummary": "string",
  "reportMarkdown": "string",
  "reportHighlights": ["string"],
  "confidence": 0.85
}
```

### Workflow Structure (Detailed)

Here's a more detailed n8n workflow structure:

**Option A: Using Code Node (Recommended for Local Development)**

1. **Webhook Trigger**
2. **Code Node** - Process all modules
   - Use JavaScript/Node.js to orchestrate
   - Call your existing local modules
   - Format and return results

**Option B: Using Individual Module Workflows + HTTP Calls**

1. **Webhook Trigger**
2. **HTTP Call - Module 1** 
3. **HTTP Call - Module 2** (uses Module 1 output)
4. **HTTP Call - Module 3** (uses Module 2 output)
5. ... continue for all modules
6. **Merge Results Node**
7. **Respond to Webhook**

### Testing the Workflow

After creating the workflow, test with:

```bash
curl -X POST http://localhost:5678/webhook/full-analysis-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "papers": [
      {
        "id": "test-1",
        "title": "Test Paper",
        "abstract": "This is a test paper",
        "content": "Full content here",
        "authors": ["Author 1"],
        "year": 2024
      }
    ],
    "question": "What are the key findings?"
  }'
```

Expected response:
```json
{
  "status": "success",
  "module1": {...},
  "module2": {...},
  ...
}
```

## How It Works Now

### Before (Removed)
1. User clicks "Analyze"
2. Chooses "Quick Analysis" or "Full Analysis"
3. Frontend calls local `/api/modules/quick-analysis` or `/api/modules/run-all`
4. Backend runs all 10 modules locally
5. Returns results

### After (New Flow)
1. User clicks "Analyze"
2. ❌ No more pipeline selection dialog
3. Frontend calls the backend API
4. Backend sends papers to `/webhook/full-analysis-workflow` on n8n
5. N8N runs all 10 modules via workflow
6. N8N returns formatted results
7. Backend saves to MongoDB
8. Backend returns to frontend

## Backend API Changes

### Old Endpoints (Still Available)
- `POST /api/modules/quick-analysis` - Local quick analysis
- `POST /api/modules/run-all` - Local full analysis

### New Endpoint
- `POST /api/modules/n8n-analysis` - Backend n8n bridge for the full analysis flow

## Frontend Changes

### Removed
- `DatasetsSection.tsx`: Removed pipeline choice dialog
- Removed `showAnalysisTypeDialog` state
- Removed `handleAnalysisTypeChoice` complexity

### Modified
- `ProcessingPipeline.tsx`: Now calls n8n endpoint
- `api.ts`: Added `n8nAnalysisModules()` function
- Default analysis type: changed to `'n8n'`

## Configuration Reference

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# N8N Configuration
N8N_BASE_URL=http://localhost:5678
N8N_ENABLED=true
N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow

# Optional
N8N_API_KEY=  # If n8n has API key authentication
```

### MongoDB Collections

The same `AnalysisReport` schema is used, with new field:
- `analysisType: 'n8n-full-analysis'` - identifies n8n results

## Fallback Behavior

If N8N is unavailable:
```javascript
const n8nHealth = await checkN8NHealth();
if (!n8nHealth) {
  return res.status(503).json({ 
    error: 'N8N server is not available. Falling back to local analysis.',
    fallbackAvailable: true 
  });
}
```

Clients can implement fallback to local analysis if needed.

## Next Steps

1. **Wait** for n8n installation to complete (~10-20 minutes)
2. **Start** n8n: `n8n start`
3. **Create** the master workflow in n8n UI
4. **Configure** OpenAI credentials in n8n
5. **Test** with the curl command above
6. **Update** `backend/.env` with N8N_BASE_URL and N8N_WORKFLOW_FULL_ANALYSIS
7. **Restart** backend
8. **Test** full flow from frontend

## Troubleshooting

### N8N Installation Stuck
- Kill the process: `Ctrl+C`
- Try again: `npm install -g n8n`
- Or use Docker: `docker run -it -p 5678:5678 n8nio/n8n`

### N8N Not Responding
```bash
# Check if running
netstat -ano | findstr :5678

# Kill if needed
taskkill /PID <PID> /F

# Restart
n8n start
```

### N8N Workflow Errors
- Check n8n logs: see browser console
- Verify OpenAI credentials
- Test webhook URL directly with curl
- Check request/response format

### Backend Connection Issues
```bash
# Test connection
curl http://localhost:5678/api/v1/health

# Check env variables
echo $N8N_BASE_URL
```

## Support & Resources

- **N8N Docs**: https://docs.n8n.io
- **N8N Community**: https://community.n8n.io
- **Your N8N UI**: http://localhost:5678
- **Backend Logs**: Check console output

## Files Modified/Created

```
Created:
- backend/src/services/n8nBridge.js
- N8N_SETUP_GUIDE.md
- This file

Modified:
- backend/src/routes/modules.js (added n8n-analysis endpoint)
- frontend/src/lib/api.ts (added n8nAnalysisModules function)
- frontend/src/pages/dashboard/sections/DatasetsSection.tsx (removed dialog)
- frontend/src/pages/dashboard/sections/datasets/ProcessingPipeline.tsx (updated to use n8n)
```

## Completion Checklist

- [ ] N8N installation complete
- [ ] N8N started and accessible at http://localhost:5678
- [ ] Admin account created
- [ ] OpenAI credentials configured
- [ ] Full-analysis-workflow created
- [ ] Webhook tested with curl
- [ ] Environment variables updated
- [ ] Backend tested with n8n-analysis endpoint
- [ ] Frontend tested (papers analyzed successfully)
- [ ] Results saved to MongoDB

Good luck! 🚀
