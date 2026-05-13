# ResearchLens N8N Workflow Variants Guide

You now have three importable N8N workflows, each with different architecture and use cases:

## Overview

| Workflow | Variant | Best For | Complexity | API Calls |
|----------|---------|----------|-----------|-----------|
| `workflow.json` | HTTP Request Nodes | Direct API integration, minimal dependencies | Low | Multiple HTTP calls |
| `workflow-ai.json` | Unified AI Agent | Flexible, single reasoning engine, unified output | Medium | OpenAI Chat Model |
| `workflow-ai-modular.json` | Separate AI Agents | Specialized sections, modular prompts, isolated logic | High | 5x OpenAI Chat Model |

---

## 1. `workflow.json` - HTTP Request Variant

**Architecture:**
```
Webhook → Prepare Input → Module 1 (HTTP) → Modules 2-5 (OpenAI HTTP) → Compose Final Report → Respond to Webhook
```

**What it does:**
- Makes direct HTTP requests to your backend API (`/api/modules/n8n-analysis`)
- For modules 2 (topic modeling) and 5 (visualization), calls OpenAI API directly via HTTP
- Composes results in a Code node
- Returns final 5-section report JSON

**Pros:**
- ✅ Simple, straightforward execution
- ✅ Direct control over each API call
- ✅ Fast execution
- ✅ Minimal N8N node dependencies
- ✅ Good for debugging individual modules

**Cons:**
- ❌ More HTTP requests (network overhead)
- ❌ Manual output composition
- ❌ Less intelligent synthesis between sections

**When to use:**
- You want the fastest possible execution
- You prefer explicit API call tracing
- Your backend handles complex orchestration
- You need to integrate with multiple external APIs

**Import Instructions:**
1. In N8N, click **+ New** → **Import from File**
2. Select `workflow.json`
3. Connect any HTTP Authentication credentials if needed
4. Activate the workflow
5. Test with POST to `http://localhost:5678/webhook/researchlens-5-section-analysis`

**Expected Input:**
```json
{
  "papers": [
    {
      "title": "Paper Title",
      "abstract": "Paper abstract",
      "content": "Full text...",
      "metadata": {...}
    }
  ],
  "question": "What is the main research question?"
}
```

**Expected Output:**
```json
{
  "summarization": {...},
  "gapDetection": {...},
  "trendDetection": {...},
  "visualization": {...},
  "chatbot": {...},
  "timestamp": "2026-05-13T...",
  "status": "completed"
}
```

---

## 2. `workflow-ai.json` - Unified AI Agent Variant

**Architecture:**
```
Webhook → Prepare Input → AI Agent (with OpenAI Chat Model) → Normalize Output → Respond to Webhook
```

**What it does:**
- Uses a single **AI Agent** node powered by OpenAI's GPT-4o-mini
- The agent receives all papers + question and reasons through all 5 sections in one go
- System prompt guides the AI to return structured JSON with all sections
- Output normalization handles multiple possible response formats
- Returns merged 5-section report

**Pros:**
- ✅ Unified AI reasoning across all sections
- ✅ Intelligent cross-section synthesis
- ✅ Fewer network calls (single agent execution)
- ✅ Flexible output parsing (handles multiple field names)
- ✅ Better contextual understanding between sections
- ✅ Fewer N8N nodes to manage

**Cons:**
- ❌ Single point of failure (if agent fails, all sections fail)
- ❌ Less granular error handling
- ❌ Requires careful prompt engineering for structured JSON output
- ❌ All sections share same temperature/settings

**When to use:**
- You want AI-driven analysis with cross-section context
- You prefer fewer network calls and simpler orchestration
- You can tolerate unified temperature/model settings
- You want to leverage advanced AI reasoning capabilities

**Import Instructions:**
1. In N8N, click **+ New** → **Import from File**
2. Select `workflow-ai.json`
3. **Critical:** Configure OpenAI credentials:
   - Click the **OpenAI Chat Model** node
   - Set your `OPENAI_API_KEY` in the credentials field
   - Verify model is `gpt-4o-mini`
   - Temperature: 0.2 (deterministic output)
4. Activate the workflow
5. Test with POST to `http://localhost:5678/webhook/researchlens-5-section-analysis`

**Expected Input:** (Same as workflow.json)

**Expected Output:** (Same as workflow.json)

---

## 3. `workflow-ai-modular.json` - Separate AI Agents Variant ⭐ Recommended

**Architecture:**
```
Webhook → Prepare Input → 
  ├─→ Summarization Agent (with OpenAI Chat Model) ─┐
  ├─→ Gap Detection Agent (with OpenAI Chat Model) ──┤
  ├─→ Trend Detection Agent (with OpenAI Chat Model)─┼→ Merge Results → Respond to Webhook
  ├─→ Visualization Agent (with OpenAI Chat Model) ──┤
  └─→ Chatbot Agent (with OpenAI Chat Model) ────────┘
```

**What it does:**
- Creates **5 separate AI Agent nodes**, each with its own OpenAI Chat Model
- Each agent has a **specialized system prompt** tailored to its section
- All 5 agents run **in parallel** from Prepare Input
- Merge Results node combines all 5 outputs into single report
- Returns final 5-section JSON

**Pros:**
- ✅ **Parallel execution** (faster than serial processing)
- ✅ Each section has **specialized AI prompts**
- ✅ **Error isolation** (one section failing doesn't stop others)
- ✅ Individual temperature/settings per section
- ✅ **Highly modular** (easy to update individual section prompts)
- ✅ Best balance of AI power and system reliability
- ✅ Easier debugging (can test each agent independently)

**Cons:**
- ❌ 5 OpenAI API calls (vs. 1 in unified agent)
- ❌ Slightly higher cost (5x chat model invocations)
- ❌ More complex N8N graph
- ❌ Less cross-section context (each agent only sees all papers once)

**When to use:**
- ✅ **RECOMMENDED** for most use cases
- You want parallel execution for speed
- You need specialized AI prompts per section
- You want fault tolerance (one section failure doesn't break everything)
- You can handle 5 OpenAI API calls
- You want easy section-level customization

**Import Instructions:**
1. In N8N, click **+ New** → **Import from File**
2. Select `workflow-ai-modular.json`
3. **Critical:** Configure OpenAI credentials for all 5 Chat Model nodes:
   - Click each **OpenAI Chat Model (X)** node
   - Set your `OPENAI_API_KEY`
   - Keep model as `gpt-4o-mini`, temperature as 0.2
   - Repeat for all 5 nodes (Summarization, Gap, Trend, Visualization, Chatbot)
4. Activate the workflow
5. Test with POST to `http://localhost:5678/webhook/researchlens-5-section-analysis-modular`

**Expected Input:** (Same as workflow.json)

**Expected Output:** (Same as workflow.json)

---

## Credential Setup (All AI Variants)

### For `workflow-ai.json` and `workflow-ai-modular.json`:

**Step 1: Add OpenAI API Key to N8N**
```bash
# Set environment variable (Windows PowerShell)
$env:OPENAI_API_KEY = "sk-your-openai-key-here"

# Then start N8N
npm run n8n
```

**Step 2: In N8N UI**
1. Go to Settings → Credentials
2. Click **+ New credential**
3. Select **OpenAI API**
4. Paste your OpenAI API key
5. Save and test connection

**Step 3: In Workflow**
- Each Chat Model node will ask you to select credentials
- Select the OpenAI API credential you just created

---

## Testing Workflow Variants

### Option A: Using Postman

```bash
# Create new POST request
POST http://localhost:5678/webhook/researchlens-5-section-analysis
# or for modular variant:
POST http://localhost:5678/webhook/researchlens-5-section-analysis-modular

# Headers:
Content-Type: application/json

# Body (raw JSON):
{
  "papers": [
    {
      "title": "Deep Learning in Medical Imaging",
      "abstract": "A comprehensive review of DL techniques...",
      "content": "Full paper content here...",
      "metadata": {"authors": ["Author 1"], "year": 2024}
    }
  ],
  "question": "What are the main challenges in applying deep learning to medical imaging?"
}
```

### Option B: Using curl

```bash
curl -X POST http://localhost:5678/webhook/researchlens-5-section-analysis-modular \
  -H "Content-Type: application/json" \
  -d @request-body.json
```

### Option C: Using Frontend API

The frontend integration is already set up in:
- `backend/src/routes/modules.js` → `POST /api/modules/n8n-analysis`
- `frontend/src/lib/api.ts` → `n8nAnalysisModules(payload)`

Simply trigger the analysis from the Dashboard, and it will call N8N via the backend bridge.

---

## Workflow Comparison Table

| Feature | HTTP | Unified AI | Modular AI |
|---------|------|-----------|-----------|
| Speed | ⚡⚡⚡ Fast | ⚡⚡ Medium | ⚡ Slowest (but parallel sections) |
| Cost per run | $ Medium | $ Low-Medium | $$ High (5 calls) |
| Error isolation | ✅ High | ❌ Low | ✅✅ Highest |
| Cross-section context | ❌ Low | ✅✅ High | ✅ Medium |
| Customization | ⚙️ Hard | ⚙️ Medium | ⚙️⚙️ Easy |
| Debuggability | ✅ Easy | ✅ Medium | ✅✅ Very Easy |
| Recommended | ➡️ For REST APIs | ➡️ For unified AI | ⭐ **Best Overall** |

---

## Troubleshooting

### "Webhook not found" error
- Check the webhook path matches exactly in the POST request
- Ensure workflow is **activated** (blue toggle on top)
- Check N8N logs: `npm run n8n -- --loglevel debug`

### OpenAI API errors
- Verify API key is set correctly in credentials
- Check OpenAI account has available credits
- Ensure model `gpt-4o-mini` is available in your account

### Output parsing errors
- Check the AI Agent's system message
- Ensure system message ends with "Do not include any text outside the JSON"
- Verify temperature is 0.2 (deterministic)

### Parallel execution not working (Modular variant)
- Click **Merge Results** node
- Check all 5 input connections are present
- Verify indices are 0, 1, 2, 3, 4 for each agent input

---

## Next Steps

1. **Choose your variant** based on the comparison table above
2. **Import into N8N** using the instructions above
3. **Configure credentials** for OpenAI (if using AI variants)
4. **Test with sample data** using Postman or curl
5. **Monitor N8N logs** for any execution errors
6. **Iterate on system prompts** if output quality needs adjustment
7. **Deploy to production** once testing is complete

---

## Additional Resources

- **N8N Documentation**: https://docs.n8n.io/
- **N8N AI Nodes**: https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Backend N8N Bridge**: `backend/src/services/n8nBridge.js`
- **Backend API Endpoint**: `POST /api/modules/n8n-analysis`

---

**Created:** May 13, 2026  
**Workflows:** 3 variants (HTTP, Unified AI, Modular AI)  
**Status:** Ready for import and testing
