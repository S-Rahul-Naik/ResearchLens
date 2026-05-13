# N8N Workflow Setup Guide for ResearchLens

This guide covers the n8n bridge used by ResearchLens. The frontend still talks to the backend, and the backend forwards analysis requests to n8n.

## Prerequisites

1. **N8N Installation**: `npm install -g n8n`
2. **N8N Running**: Start n8n with `n8n start` (runs on http://localhost:5678)
3. **OpenAI API Key**: Set `OPENAI_API_KEY` environment variable if your workflow uses OpenAI nodes
4. **Backend N8N Config**: Set in `backend/.env`:
   ```
   N8N_BASE_URL=http://localhost:5678
   N8N_ENABLED=true
  N8N_API_KEY=
  N8N_WORKFLOW_FULL_ANALYSIS=full-analysis-workflow
   ```

## Workflow Setup Steps

### 1. Start N8N

```bash
n8n start
```

Access at: http://localhost:5678

### 2. Create API Connection to Backend

In N8N UI:
- Go to Settings → Credentials
- Add OpenAI API credential if your workflow uses model nodes
- Add HTTP Basic Auth or API key credentials only if you protect the webhook manually

### 3. Create Master Workflow: `full-analysis-workflow`

This is the main workflow that orchestrates all modules.

**Workflow Structure:**
```
Start (Webhook) 
  ↓
Extract Papers Data
  ↓
Run Module 1 (Summarization) - HTTP Call to Local Function
  ↓
Run Module 2 (Topic Modeling) - OpenAI Processing
  ↓
Run Module 3 (Gap Detection) - OpenAI Processing
  ↓
Run Module 4 (Trend Detection) - Loop Processing
  ↓
Run Module 5 (Visualization) - Data Formatting
  ↓
Run Module 6 (Chatbot) - RAG Processing
  ↓
Run Module 7 (Contradiction) - Analysis Node
  ↓
Run Module 8 (Dataset Matrix) - Data Aggregation
  ↓
Run Module 9 (Related Work) - LLM Generation
  ↓
Run Module 10 (Honesty) - Scoring Node
  ↓
Format Results
  ↓
Return JSON Response
```

**Expected webhook path:** `full-analysis-workflow`

**Expected input from the backend:**
```json
{
  "papers": [
    {
      "id": "paper_id",
      "title": "string",
      "authors": [],
      "year": 2024,
      "abstract": "string",
      "content": "string",
      "keywords": []
    }
  ],
  "question": "What are the key findings and open research gaps?",
  "timestamp": "2026-05-13T00:00:00.000Z"
}
```

**Expected response shape:**
```json
{
  "module1": {},
  "module2": {},
  "module3": {},
  "module4": {},
  "module5": {},
  "module6": {},
  "module7": {},
  "module8": {},
  "module9": {},
  "module10": {},
  "reportTitle": "string",
  "reportSummary": "string",
  "reportMarkdown": "string",
  "reportHighlights": [],
  "confidence": 0.85,
  "processingTimeMs": 0
}
```

## Individual Workflow Configurations

### Module 1: Summarization Workflow

Use this only if you want to invoke a module independently. The main app flow uses the full-analysis webhook above through `POST /api/modules/n8n-analysis`.

**Input:**
```json
{
  "papers": [
    {
      "id": "paper_id",
      "title": "string",
      "abstract": "string",
      "content": "string"
    }
  ]
}
```

**Nodes:**
1. **Webhook Trigger** - Listen for POST requests
2. **Loop Papers** - Loop through each paper
3. **HTTP Call** - Call local summarization endpoint (optional)
4. **Set Summaries** - Format results
5. **Return** - Send back formatted summaries

**Output:**
```json
{
  "summaries": [
    {
      "paperId": "string",
      "title": "string",
      "summary": "string"
    }
  ]
}
```

### Module 2: Topic Modeling Workflow

**Input:**
```json
{
  "papers": [...],
  "module1": { "summaries": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Prepare Text for Analysis** - Combine summaries
3. **OpenAI Chat** - Call OpenAI API with prompt:
   ```
   Extract 5-10 main research topics from the following papers:
   [paper summaries]
   
   Return JSON with: topics (array with name, description, keywords, paperIds)
   ```
4. **Parse OpenAI Response**
5. **Create Topic Assignments** - Map papers to topics
6. **Return** - Send formatted topics and assignments

**Output:**
```json
{
  "topics": [
    {
      "id": "string",
      "name": "string",
      "keywords": ["string"],
      "coherence": 0.85
    }
  ],
  "assignments": [
    {
      "paperId": "string",
      "topicId": "string"
    }
  ]
}
```

### Module 3: Gap Detection Workflow

**Input:**
```json
{
  "papers": [...],
  "module2": { "topics": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Build Topic Context**
3. **OpenAI Chat** - Call with prompt:
   ```
   Analyze these research topics and identify gaps and intersections:
   [topics and papers]
   
   Return JSON with: gaps (array with topicA, topicB, gapScore, explanation)
   ```
4. **Parse Response**
5. **Score Gaps** - Assign confidence scores
6. **Return** - Send formatted gaps

**Output:**
```json
{
  "gaps": [
    {
      "id": "string",
      "topicA": "string",
      "topicB": "string",
      "topicALabel": "string",
      "topicBLabel": "string",
      "gapScore": 0.75,
      "explanation": "string"
    }
  ]
}
```

### Module 4: Trend Detection Workflow

**Input:**
```json
{
  "papers": [...],
  "module2": { "topics": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Extract Temporal Data**
3. **Analyze Year Distribution** - Group papers by year
4. **OpenAI Chat** - Detect trends:
   ```
   Analyze these topics over time [years and papers]:
   Identify trends (rising, falling, stable, emerging)
   ```
5. **Format Trends**
6. **Return**

**Output:**
```json
{
  "trends": [
    {
      "topicId": "string",
      "topicName": "string",
      "trend": "rising|falling|stable|emerging",
      "yearlyData": [{"year": 2024, "count": 5}]
    }
  ]
}
```

### Module 5: Visualization Workflow

**Input:**
```json
{
  "module2": { "topics": [...] },
  "module3": { "gaps": [...] },
  "module4": { "trends": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Prepare Visualization Data**
3. **Format for Charts** - Create data structures for:
   - Topic network (nodes and edges)
   - Gap visualization (relationship strengths)
   - Trend timeline
4. **Return** - Send visualization-ready JSON

**Output:**
```json
{
  "visualization": {
    "network": { "nodes": [...], "edges": [...] },
    "gapChart": {...},
    "trendChart": {...}
  }
}
```

### Module 6: Chatbot/RAG Workflow

**Input:**
```json
{
  "papers": [...],
  "module3": { "gaps": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Index Papers** - Build embeddings/search index
3. **For Each Gap** - Process each gap:
   - Query: Find papers relevant to gap
   - OpenAI: Generate supporting evidence
4. **Return** - Send evidence snippets

**Output:**
```json
{
  "gapEvidences": [
    {
      "gapId": "string",
      "evidences": ["paper excerpt 1", "paper excerpt 2"]
    }
  ]
}
```

### Module 7: Contradiction Detection Workflow

**Input:**
```json
{
  "papers": [...]
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Extract Key Claims** - Use OpenAI to extract claims
3. **Analyze Contradictions**:
   ```
   Identify contradictory findings in these papers:
   [claims and papers]
   ```
4. **Return**

**Output:**
```json
{
  "contradictions": [
    {
      "claim1": "string",
      "claim2": "string",
      "papers": ["paperId1", "paperId2"],
      "severity": "high|medium|low"
    }
  ]
}
```

### Module 8: Dataset/Method Matrix Workflow

**Input:**
```json
{
  "papers": [...]
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Extract Methods & Datasets**:
   ```
   Extract datasets and methodologies used in these papers
   ```
3. **Build Matrix** - Create relationships
4. **Return**

**Output:**
```json
{
  "matrix": {
    "datasets": ["dataset1", "dataset2"],
    "methods": ["method1", "method2"],
    "usage": {
      "dataset1": ["method1", "method3"],
      "dataset2": ["method2"]
    }
  }
}
```

### Module 9: Related Work Draft Workflow

**Input:**
```json
{
  "papers": [...],
  "module2": { "topics": [...] }
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Organize Papers by Topic**
3. **Generate Narrative**:
   ```
   Write a related work section covering:
   [papers organized by topic]
   
   Include: historical development, key works, current state
   ```
4. **Return**

**Output:**
```json
{
  "relatedWork": [
    {
      "section": "string",
      "content": "string",
      "citedPapers": ["paperId1", "paperId2"]
    }
  ]
}
```

### Module 10: Scientific Honesty/Integrity Workflow

**Input:**
```json
{
  "papers": [...]
}
```

**Nodes:**
1. **Webhook Trigger**
2. **Analyze Papers**:
   ```
   Evaluate these papers on:
   - Methodology clarity
   - Statistical rigor
   - Replicability indicators
   - Conflict of interest disclosure
   
   Provide honesty/integrity score (0-1)
   ```
3. **Score & Aggregate**
4. **Return**

**Output:**
```json
{
  "honestyScore": 0.82,
  "methodology": 0.80,
  "statistical": 0.85,
  "replicability": 0.80,
  "details": "string"
}
```

## API Format

All N8N workflows should:
1. **Accept** webhook POST requests
2. **Return** JSON with `status: 'success'` or `status: 'error'`
3. **Include** relevant module output in the response
4. **Handle** errors gracefully with error messages

## Testing Locally

```bash
curl -X POST http://localhost:5678/webhook/full-analysis-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "papers": [{...}],
    "question": "What are the key findings?"
  }'
```

## Backend Integration

The backend will:
1. Extract papers from MongoDB
2. Send to the n8n webhook
3. Wait for response
4. Save results to AnalysisReport model
5. Return to frontend

See `n8nBridge.js` for implementation details.
