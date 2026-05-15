# N8N Backend Integration Guide

This guide explains how to integrate N8N workflows with the ResearchLens backend to automatically save analysis results to the database and display them on the frontend.

## Architecture Overview

```
N8N Workflow (5 parallel modules)
    ↓
Merge Results (combine 5 outputs)
    ↓
  Respond to Webhook → Return merged results directly to frontend
    ↓
  Frontend receives merged result and displays it (no backend save required)
```

## Backend Setup

### 1. Webhook Endpoint Created ✅

A new endpoint has been created at:
```
POST /api/modules/n8n-webhook
```

**Location:** `backend/src/routes/modules.js` (lines ~1042-1155)

**Accepts:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "reportName": "Analysis Report Name",
  "papers": [
    {
      "id": "paper1",
      "title": "Paper Title",
      "abstract": "Abstract text",
      "year": 2024,
      "authors": ["Author Name"]
    }
  ],
  "summarization": { /* Gemini response */ },
  "gapDetection": { /* Gemini response */ },
  "trendDetection": { /* Gemini response */ },
  "visualization": { /* Gemini response */ },
  "chatbot": { /* Optional */ },
  "timestamp": "2024-05-14T18:30:00Z",
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "507f1f77bcf86cd799439012",
  "message": "Analysis results saved successfully",
  "run": { /* Full RunAllResult object */ }
}
```

### 2. Data Mapping

The N8N webhook maps results to the AnalysisReport model:

| N8N Output | Backend Module | MongoDB Field |
|-----------|---|---|
| `summarization` | Module 1 | `module1` |
| `gapDetection` | Module 3 | `module3` |
| `trendDetection` | Module 4 | `module4` |
| `visualization` | Module 5 | `module5` |
| `chatbot` | Module 6 | `module6` |

The result is automatically saved with computed metadata:
- `topicCount`: Calculated from results
- `gapCount`: Calculated from results
- `qualityScore`: Set to 0.75 (can be enhanced)
- `yearRange`: Extracted from papers

## N8N Workflow Configuration

### 1. Updated Workflow File

**File:** `workflow-n8n-with-backend-integration.json`

This workflow includes:
- **4 parallel LLM calls** (Summarization, Gap Detection, Trend Detection, Visualization)
- **Staggered delays** to avoid rate limiting
- **Merge Results node** to combine outputs
- **Respond to Webhook** that returns the merged JSON directly to the caller (frontend)

### 2. Key N8N Nodes

#### Prepare Input
```javascript
// Formats the incoming webhook data
const papers = $input.all()[0]?.json?.papers || [];
const userId = $input.all()[0]?.json?.userId;
const reportName = $input.all()[0]?.json?.reportName;
const papersList = papers.map((p, i) => 
  `${i+1}. Title: ${p.title}\nAbstract: ${p.abstract}`
).join('\n\n');

return [{json: {papers, userId, question, reportName, papersList}}];
```

#### Gemini API Calls (4 parallel)
Each uses environment variables for API keys:
```javascript
// HTTP Request node configuration
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
Method: POST
JSON Body: {{ {
  contents: [{
    parts: [{
      text: 'Summarize this research: ' + $json.papersList
    }]
  }],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 200
  }
} }}
```

#### Merge Results
```javascript
// Combines all 5 outputs
const inputs = $input.all();
return [{
  json: {
    summarization: inputs[0]?.json,
    gapDetection: inputs[1]?.json,
    trendDetection: inputs[2]?.json,
    visualization: inputs[3]?.json,
    chatbot: inputs[4]?.json,
    timestamp: new Date().toISOString(),
    status: 'completed',
    papers: $input.all()[0]?.json?.papers,
    userId: $input.all()[0]?.json?.userId,
    reportName: $input.all()[0]?.json?.reportName
  }
}];
```

#### Respond to Webhook
```javascript
// Respond node
// Returns merged JSON produced by the workflow directly to the HTTP caller
// (frontend should POST papers to the workflow's webhook URL and receive results)
```

### 3. Environment Variables for N8N

Set these in your N8N environment or via Docker Compose:

```env
# Gemini API Keys (use different keys for rate limit distribution)
GEMINI_API_KEY_1=your_key_1
GEMINI_API_KEY_2=your_key_2
GEMINI_API_KEY_3=your_key_3
GEMINI_API_KEY_4=your_key_4
```

In N8N workflow, reference them as: `{{$env.GEMINI_API_KEY_1}}`

## Frontend Setup

### 1. Environment Variables

Add to `.env.local`:
```env
# Backend API
VITE_API_BASE_URL=http://localhost:4000

# N8N webhook (optional, for direct triggering)
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/researchlens-5-section-analysis-modular
```

### 2. API Functions

New API functions in `frontend/src/lib/api.ts`:

```typescript
// Trigger N8N webhook directly
export async function triggerN8NWebhook(payload: N8NWebhookPayload): Promise<N8NWebhookResponse>;

// Existing functions also work with N8N results
export async function apiGetAnalysisReports(): Promise<{ count: number; reports: RunAllResult[] }>;
export async function apiGetAnalysisReport(reportId: string): Promise<RunAllResult>;
```

### 3. Usage Example

```typescript
import { triggerN8NWebhook, apiGetAnalysisReport, useAnalysisHistory } from '@/lib/api';

// Option 1: Trigger N8N webhook directly
const response = await triggerN8NWebhook({
  userId: user._id,
  reportName: 'My Analysis',
  papers: selectedPapers,
  question: 'Analyze research gaps'
});

// Then fetch the saved report
const report = await apiGetAnalysisReport(response.reportId);

// Option 2: Use existing n8nAnalysisModules (backend triggers N8N)
const result = await n8nAnalysisModules({
  papers: selectedPapers,
  question: 'Analyze research gaps'
});
```

### 4. Display Results

The returned `RunAllResult` object is automatically displayed by the Dashboard:

```typescript
export default function DashboardPage() {
  const { currentRun } = useAnalysisHistory();
  
  // Results are extracted and displayed by sections:
  return (
    <>
      <DatasetSummarySection run={currentRun} />
      <TopicModelingSection run={currentRun} />
      <GapDetectionSection run={currentRun} />
      <TrendAnalysisSection run={currentRun} />
      <ResearchMapResultsSection run={currentRun} />
      <ChatResultsSection run={currentRun} />
    </>
  );
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React/TypeScript)                │
│                                                              │
│  Dashboard Component                                         │
│    ├─ DatasetSummarySection                                │
│    ├─ TopicModelingSection                                 │
│    ├─ GapDetectionSection                                  │
│    ├─ TrendAnalysisSection                                 │
│    ├─ ResearchMapResultsSection                            │
│    └─ ChatResultsSection                                   │
│                                                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
        Option 1: Backend Call   Option 2: Direct N8N
                 │                     │
                 ▼                     ▼
        ┌──────────────────┐   ┌──────────────────┐
        │ Backend /api/    │   │ N8N Webhook /    │
        │ modules/n8n-     │   │ webhook/...      │
        │ analysis         │   │                  │
        └────────┬─────────┘   └────────┬─────────┘
                 │                      │
                 ▼                      ▼
        ┌──────────────────┐   ┌──────────────────┐
        │  N8N Master      │   │  N8N 5 Modules   │
        │  Workflow        │   │  in Parallel     │
        │                  │   │                  │
        │ ┌──────────────┐ │   │ ┌──────────────┐ │
        │ │  Module 1    │ │   │ │  Summarize   │ │
        │ ├──────────────┤ │   │ ├──────────────┤ │
        │ │  Module 2    │ │   │ │  Gap Detect  │ │
        │ ├──────────────┤ │   │ ├──────────────┤ │
        │ │  Module 3    │ │   │ │  Trend Detect│ │
        │ ├──────────────┤ │   │ ├──────────────┤ │
        │ │  Module 4    │ │   │ │  Visualize   │ │
        │ ├──────────────┤ │   │ │              │ │
        │ │  Module 5    │ │   │ └──────────────┘ │
        │ └──────────────┘ │   │                  │
        │                  │   │ ┌──────────────┐ │
        │ Merge Results    │   │ │ Merge Results│ │
        │ ┌──────────────┐ │   │ └──────────────┘ │
        │ │  All Results │ │   │                  │
        │ └──────────────┘ │   │ POST to Backend  │
        └────────┬─────────┘   └────────┬─────────┘
                 │                      │
                 └──────────┬───────────┘
                            │
                            ▼
                ┌─────────────────────────────┐
                │  Backend n8n-webhook        │
                │  Endpoint                   │
                │                             │
                │  • Parse N8N results        │
                │  • Map to modules 1-10      │
                │  • Calculate metadata       │
                │  • Save to MongoDB          │
                └────────────┬────────────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │  MongoDB                    │
                │  AnalysisReport Collection  │
                │                             │
                │  {                          │
                │    userId: ...              │
                │    reportName: ...          │
                │    module1-10: {...}        │
                │    metadata: {...}          │
                │  }                          │
                └────────────┬────────────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │ Frontend API                │
                │ apiGetAnalysisReport()      │
                │ apiGetAnalysisReports()     │
                └────────────┬────────────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │  Dashboard Displays         │
                │  All Modules & Results      │
                └─────────────────────────────┘
```

## Testing

### 1. Test Backend Webhook

```bash
curl -X POST http://localhost:4000/api/modules/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "reportName": "Test Report",
    "papers": [
      {
        "id": "paper1",
        "title": "Test Paper",
        "abstract": "A test abstract",
        "year": 2024
      }
    ],
    "summarization": {"summary": "Test summary"},
    "gapDetection": {"gaps": []},
    "trendDetection": {"trends": []},
    "visualization": {},
    "timestamp": "2024-05-14T18:30:00Z",
    "status": "completed"
  }'
```

### 2. Test N8N Workflow

1. Open N8N at `http://localhost:5678`
2. Import the workflow: `workflow-n8n-with-backend-integration.json`
3. Configure environment variables in N8N settings
4. Create a test execution with sample paper data
5. Check backend logs for webhook response

### 3. Verify MongoDB

```javascript
// MongoDB query to check saved reports
db.analysisreports.find({ reportName: /Test/i }).pretty();
```

## Troubleshooting

### Issue: N8N webhook fails to POST to backend

**Solution:**
- Ensure backend is running on `http://localhost:4000`
- Check N8N can resolve the hostname (use IP if needed)
- Verify firewall isn't blocking port 4000
- Check N8N logs for error details

### Issue: Results not appearing on frontend

**Solution:**
- Verify MongoDB has the saved report
- Check that `userId` in N8N matches logged-in user
- Ensure frontend is calling `apiGetAnalysisReport(reportId)` with correct ID
- Check browser console for API errors

### Issue: Gemini API errors

**Solution:**
- Verify API keys are correct and valid
- Check rate limits aren't exceeded
- Ensure different keys are used for each parallel request
- Check Gemini API documentation for quota limits

## Next Steps

1. **Configure N8N Environment**: Set up Gemini API keys
2. **Deploy Workflow**: Import the integration workflow to your N8N instance
3. **Test Integration**: Use curl to test the webhook
4. **Frontend Testing**: Trigger analysis from dashboard
5. **Monitor**: Check logs and MongoDB for successful saves

## Files Modified/Created

- ✅ `backend/src/routes/modules.js` - Added N8N webhook endpoint
- ✅ `workflow-n8n-with-backend-integration.json` - New integrated workflow
- ✅ `frontend/src/lib/api.ts` - Added N8N webhook trigger functions
- 📄 `N8N_BACKEND_INTEGRATION.md` - This documentation

## Environment Variables Reference

### Backend `.env`
```env
# N8N Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_api_key_if_needed
N8N_ENABLED=true
```

### N8N Credentials
```
GEMINI_API_KEY_1=your_key
GEMINI_API_KEY_2=your_key
GEMINI_API_KEY_3=your_key
GEMINI_API_KEY_4=your_key
```

### Frontend `.env.local`
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/researchlens-5-section-analysis-modular
```

## Performance Optimization

- **Parallel Processing**: 4 LLM calls run simultaneously (not sequential)
- **Staggered Delays**: 1s, 2s, 3s between some calls to distribute API load
- **MongoDB Indexing**: Consider adding indexes on userId and timestamp
- **Rate Limiting**: Use multiple Gemini keys to avoid rate limits

## Security Considerations

⚠️ **API Keys in N8N**: 
- Use N8N credentials/variables, not hardcoded in workflow
- Regenerate keys periodically
- Never commit workflow JSON with real keys

⚠️ **Webhook Security**:
- Consider adding authentication token to N8N webhook calls
- Validate `userId` exists before saving
- Log all webhook calls for audit trail

---

**Last Updated:** May 14, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for Integration
