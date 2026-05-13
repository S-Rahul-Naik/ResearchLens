# ResearchLens N8N Workflows - Quick Reference

## Files Created

| File | Type | Purpose | Size | Status |
|------|------|---------|------|--------|
| `workflow.json` | N8N Workflow | HTTP Request variant (5 sections via API calls) | ~8KB | ✅ Ready |
| `workflow-ai.json` | N8N Workflow | Unified AI Agent variant (single agent, 5 sections) | ~12KB | ✅ Ready |
| `workflow-ai-modular.json` | N8N Workflow | Modular AI variant (5 separate agents, parallel) | ~15KB | ✅ Ready |
| `WORKFLOWS_GUIDE.md` | Documentation | Comprehensive guide for all 3 variants | Full guide | ✅ Ready |

---

## Three Workflow Variants at a Glance

### 1️⃣ `workflow.json` - Simple HTTP Requests
**Use when:** You want direct control over API calls  
**Webhook endpoint:** `/researchlens-5-section-analysis`  
**Technology:** HTTP Request nodes + local backend  
**Sections:** All 5 (summarization, gap, trend, visualization, chatbot)  
**Speed:** ⚡ Fastest (multiple parallel HTTP calls)  
**Cost:** $ Medium (backend API calls)  
**Complexity:** 🟢 Low  

### 2️⃣ `workflow-ai.json` - Single AI Agent
**Use when:** You want unified AI reasoning  
**Webhook endpoint:** `/researchlens-5-section-analysis`  
**Technology:** AI Agent node + OpenAI Chat Model  
**Sections:** All 5 (single agent processes all)  
**Speed:** ⚡⚡ Medium (one agent execution)  
**Cost:** $ Low-Medium (1 OpenAI call)  
**Complexity:** 🟡 Medium  
**Requires:** OpenAI API key  

### 3️⃣ `workflow-ai-modular.json` - Five AI Agents (Recommended ⭐)
**Use when:** You want specialized AI + parallel execution + fault tolerance  
**Webhook endpoint:** `/researchlens-5-section-analysis-modular`  
**Technology:** 5x AI Agent nodes + 5x OpenAI Chat Model nodes  
**Sections:** All 5 (each with dedicated agent)  
**Speed:** ⚡ Parallel execution (fastest for 5 sections)  
**Cost:** $$ Higher (5 OpenAI calls, but parallel)  
**Complexity:** 🔴 High (best modularity)  
**Requires:** OpenAI API key  
**Best for:** Most production use cases  

---

## Quick Import Checklist

### For `workflow.json`:
- [ ] Open N8N (http://localhost:5678)
- [ ] Click **+ New** → **Import from File**
- [ ] Select `workflow.json`
- [ ] Click **Activate** (blue toggle)
- [ ] Test: POST to `http://localhost:5678/webhook/researchlens-5-section-analysis`

### For `workflow-ai.json`:
- [ ] Open N8N
- [ ] Click **+ New** → **Import from File**
- [ ] Select `workflow-ai.json`
- [ ] Set environment: `OPENAI_API_KEY=sk-...`
- [ ] Click **OpenAI Chat Model** node → Add/select OpenAI credentials
- [ ] Click **Activate**
- [ ] Test: POST to `http://localhost:5678/webhook/researchlens-5-section-analysis`

### For `workflow-ai-modular.json`:
- [ ] Open N8N
- [ ] Click **+ New** → **Import from File**
- [ ] Select `workflow-ai-modular.json`
- [ ] Set environment: `OPENAI_API_KEY=sk-...`
- [ ] Click each **OpenAI Chat Model (Summarization/Gap/Trend/Visualization/Chatbot)** node
- [ ] Add/select OpenAI credentials for **all 5 nodes**
- [ ] Click **Activate**
- [ ] Test: POST to `http://localhost:5678/webhook/researchlens-5-section-analysis-modular`

---

## Test Request Template

```bash
curl -X POST http://localhost:5678/webhook/researchlens-5-section-analysis-modular \
  -H "Content-Type: application/json" \
  -d '{
    "papers": [
      {
        "title": "A Survey of Deep Learning for Computer Vision",
        "abstract": "This survey covers the recent advances in deep learning...",
        "content": "Full paper content with methods and results...",
        "metadata": {"year": 2024, "authors": ["Author Name"]}
      }
    ],
    "question": "What are the latest trends in deep learning for vision tasks?"
  }'
```

**Expected response:**
```json
{
  "summarization": {
    "summary": "...",
    "keyFindings": [...],
    "methodology": "..."
  },
  "gapDetection": {
    "gaps": [...],
    "recommendations": [...],
    "priority": "high"
  },
  "trendDetection": {
    "trends": [...],
    "emergingAreas": [...],
    "futureDirections": [...]
  },
  "visualization": {
    "visualizations": [...],
    "dataPoints": [...]
  },
  "chatbot": {
    "botResponse": "...",
    "suggestedFollowUps": [...],
    "confidence": "high"
  },
  "timestamp": "2026-05-13T...",
  "status": "completed",
  "processingMode": "modular-ai-agents" // or "http-requests" or "unified-ai-agent"
}
```

---

## Backend Integration (Already Implemented)

The frontend and backend are already integrated with N8N:

**Backend Route:** `backend/src/routes/modules.js`
```javascript
POST /api/modules/n8n-analysis
// - Requires authentication
// - Checks N8N health
// - Calls n8nBridge.callN8NFullAnalysis()
// - Formats and returns results
// - Persists to MongoDB
```

**N8N Bridge Service:** `backend/src/services/n8nBridge.js`
```javascript
// Key functions:
callN8NFullAnalysis(papers, question)     // Triggers workflow webhook
formatN8NResults(response, papers)         // Formats response
checkN8NHealth()                           // Validates N8N availability
```

**Frontend API:** `frontend/src/lib/api.ts`
```typescript
n8nAnalysisModules(payload)  // Makes POST to /api/modules/n8n-analysis
```

**Frontend Component:** `frontend/src/pages/dashboard/sections/datasets/ProcessingPipeline.tsx`
```typescript
// Calls n8nAnalysisModules() and displays processing status
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│         ProcessingPipeline.tsx → n8nAnalysisModules()           │
└──────────────────┬──────────────────────────────────────────────┘
                   │ POST /api/modules/n8n-analysis
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                    │
│  routes/modules.js → services/n8nBridge.js → callN8NFullAnalysis()
└──────────────────┬──────────────────────────────────────────────┘
                   │ POST /webhook/researchlens-5-section-analysis*
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    N8N (localhost:5678)                          │
│                                                                  │
│  Choose one of three workflows:                                 │
│  1. workflow.json (HTTP + backend calls)                        │
│  2. workflow-ai.json (Single AI Agent)                          │
│  3. workflow-ai-modular.json (5x AI Agents) ⭐                 │
└──────────────────┬──────────────────────────────────────────────┘
                   │ 5-section analysis result
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                 RESPONSE (JSON Analysis Report)                  │
│  { summarization, gapDetection, trendDetection,                │
│    visualization, chatbot, timestamp, status }                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Expectations

| Metric | HTTP | Unified AI | Modular AI |
|--------|------|-----------|-----------|
| Total time | 2-5s | 5-10s | 6-12s (parallel) |
| OpenAI calls | 0 | 1 | 5 |
| Backend calls | 1-5 | 1 | 0 |
| Token usage | N/A | ~1000-2000 | ~4000-8000 |
| Cost per run | ~$0.01-0.05 | ~$0.10-0.20 | ~$0.40-0.80 |

---

## Troubleshooting Guide

**Q: "Cannot POST /webhook/..."**  
A: Workflow not activated. Check blue toggle in N8N UI.

**Q: OpenAI Error: "401 Unauthorized"**  
A: Invalid API key. Check environment variable: `echo $env:OPENAI_API_KEY`

**Q: Output is empty or malformed**  
A: System prompt needs refinement. Check AI Agent parameters and increase max tokens.

**Q: Modular variant running serially instead of parallel**  
A: Check all 5 agents are connected from Prepare Input node.

**Q: N8N won't start**  
A: Delete `C:\Users\prave\.n8n` folder and restart: `npm run n8n`

---

## Next Actions (Recommended Order)

1. **Pick your variant** (⭐ `workflow-ai-modular.json` recommended)
2. **Get OpenAI API key** from https://platform.openai.com/api-keys
3. **Import workflow** into N8N (see checklist above)
4. **Configure credentials** in N8N UI
5. **Test with curl/Postman** using template above
6. **Monitor logs** for any errors
7. **Adjust system prompts** if needed for quality improvement
8. **Deploy to production**

---

## Files Location

```
researchlens/
├── workflow.json ........................... HTTP variant (ready to import)
├── workflow-ai.json ....................... Unified AI variant (ready to import)
├── workflow-ai-modular.json ............... Modular AI variant ⭐ (ready to import)
├── WORKFLOWS_GUIDE.md ..................... Full documentation
├── WORKFLOWS_QUICK_REFERENCE.md ........... This file
├── backend/
│   └── src/
│       ├── services/n8nBridge.js ......... N8N bridge service
│       └── routes/modules.js ............. API endpoint
└── frontend/
    └── src/
        ├── lib/api.ts ................... API client
        └── pages/dashboard/
            └── sections/datasets/
                └── ProcessingPipeline.tsx . UI component
```

---

**Status:** ✅ All 3 workflows created and validated  
**JSON Valid:** ✅ Yes (tested with PowerShell)  
**Ready for Import:** ✅ Yes  
**Documentation:** ✅ Complete (see WORKFLOWS_GUIDE.md)  
**Integration:** ✅ Backend & frontend ready  

**Last Updated:** May 13, 2026  
**Created by:** GitHub Copilot
