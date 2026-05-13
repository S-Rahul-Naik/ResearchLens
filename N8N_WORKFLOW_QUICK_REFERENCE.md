# N8N Workflow Quick Reference

This reference is for the standalone n8n workflow templates. The main app still uses the backend bridge at `POST /api/modules/n8n-analysis`.

## Quick Start: Master Workflow Template

Create this workflow in N8N to orchestrate all 10 analysis modules.

### Simple JavaScript Code Node Approach

Create a **single Code Node** that handles everything:

```javascript
// N8N Code Node JavaScript
const papers = $input.all();

// Extract papers from input
const papersData = papers[0].json.papers || [];
const question = papers[0].json.question || "What are the key findings?";

// Simulate module execution (replace with actual calls)
const mockResults = {
  status: 'success',
  module1: {
    summaries: papersData.map((p, i) => ({
      paperId: p.id,
      title: p.title,
      summary: `Summary of ${p.title}...`,
    }))
  },
  module2: {
    topics: [
      { id: "topic_1", name: "Machine Learning", keywords: ["ML", "AI"], coherence: 0.85 },
      { id: "topic_2", name: "Data Science", keywords: ["data", "statistics"], coherence: 0.78 }
    ],
    assignments: papersData.flatMap((p, i) => [
      { paperId: p.id, topicId: "topic_" + (i % 2 + 1) }
    ])
  },
  module3: {
    gaps: [
      {
        gapId: "gap_1",
        topicA: "topic_1",
        topicB: "topic_2",
        gapScore: 0.72,
        similarity: 0.65,
        coOccurrence: 3
      }
    ]
  },
  module4: {
    trends: [
      { id: "trend_1", name: "Growing Interest", trend: "rising" }
    ]
  },
  module5: {
    visualization: {
      network: { nodes: [], edges: [] }
    }
  },
  module6: {
    gapEvidences: []
  },
  module7: {
    contradictions: []
  },
  module8: {
    matrix: {}
  },
  module9: {
    relatedWork: []
  },
  module10: {
    honestyScore: 0.82
  },
  reportTitle: "Research Analysis Report",
  reportSummary: "Executive summary...",
  reportMarkdown: "# Report\n\nMarkdown content...",
  reportHighlights: ["Finding 1", "Finding 2"],
  confidence: 0.85,
  processingTimeMs: 45000
};

return mockResults;
```

### Visual Workflow in N8N UI

```
┌─────────────────┐
│   Webhook In    │
│  (Start Trigger)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Code Node     │
│  (All Logic)    │
│  - Parse Input  │
│  - Run Modules  │
│  - Format Out   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Respond to     │
│   Webhook       │
│  (Return JSON)  │
└─────────────────┘
```

## Module-by-Module: If Building Individual Workflows

### Module 1: Summarization

```javascript
// Code node for Module 1
const papers = $input.all()[0].json.papers || [];

return {
  summaries: papers.map((p) => ({
    paperId: p.id,
    title: p.title,
    summary: `This paper titled "${p.title}" discusses ${p.abstract.substring(0, 80)}...`,
    keywords: p.keywords || []
  }))
};
```

### Module 2: Topic Modeling

```javascript
// Code node for Module 2
const papers = $input.all()[0].json.papers || [];
const summaries = $input.all()[0].json.module1?.summaries || [];

// Simulate topic detection
const topicNames = ["Machine Learning", "Neural Networks", "Data Science"];
const topics = topicNames.map((name, idx) => ({
  id: `topic_${idx}`,
  name: name,
  keywords: name.toLowerCase().split(" "),
  coherence: 0.75 + Math.random() * 0.2,
  paperIds: Array.from({ length: Math.ceil(papers.length / 2) }, (_, i) => i)
}));

return {
  topics,
  assignments: papers.flatMap((p, idx) => ({
    paperId: p.id,
    topicId: `topic_${idx % topics.length}`
  }))
};
```

### Module 3: Gap Detection

```javascript
// Code node for Module 3
const topics = $input.all()[0].json.module2?.topics || [];

const gaps = [];
for (let i = 0; i < topics.length - 1; i++) {
  gaps.push({
    gapId: `gap_${i}`,
    topicA: topics[i].id,
    topicB: topics[i + 1].id,
    topicALabel: topics[i].name,
    topicBLabel: topics[i + 1].name,
    similarity: Math.random() * 0.5,
    coOccurrence: Math.floor(Math.random() * 5),
    gapScore: 0.5 + Math.random() * 0.3,
    explanation: `Gap between ${topics[i].name} and ${topics[i + 1].name}`
  });
}

return { gaps };
```

### Module 4: Trend Detection

```javascript
// Code node for Module 4
const topics = $input.all()[0].json.module2?.topics || [];
const papers = $input.all()[0].json.papers || [];

return {
  trends: topics.map(topic => ({
    topicId: topic.id,
    topicName: topic.name,
    trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
    yearlyCounts: [
      { year: 2022, count: Math.floor(papers.length / 3) },
      { year: 2023, count: Math.floor(papers.length / 2) },
      { year: 2024, count: papers.length }
    ]
  }))
};
```

## Running Local Functions from N8N

If you want N8N to call your existing local Python/Node functions:

### Option 1: HTTP Call to Local Endpoint

```
N8N HTTP Node:
- Method: POST
- URL: http://localhost:4000/api/modules/1-summarization
- Headers: Content-Type: application/json
- Body: { "papers": {{ $input.json.papers }} }
```

### Option 2: Direct Python Execution

```javascript
// N8N Code Node - Call Python
const { spawn } = require('child_process');

const process = spawn('python', ['path/to/script.py']);

return new Promise((resolve, reject) => {
  let output = '';
  process.stdout.on('data', (data) => {
    output += data.toString();
  });
  process.on('close', (code) => {
    try {
      resolve(JSON.parse(output));
    } catch(e) {
      reject(e);
    }
  });
});
```

### Option 3: Import Node.js Module

```javascript
// N8N Code Node - Direct module import
const { runModule1Summarization } = require('/path/to/module1Summarization.js');

const papers = $input.all()[0].json.papers;
const result = runModule1Summarization(papers);

return result;
```

## Testing in N8N

### View Full Input
```javascript
return $input.all();
```

### Log to Console
```javascript
console.log("Debug:", $input.all());
return $input.all();
```

### Simulate Delay (if needed)
```javascript
await new Promise(r => setTimeout(r, 2000)); // 2 second delay
return { status: 'completed' };
```

## Common N8N Patterns

### Loop Through Array
```
Loop Node:
- Source data: items from array
- For each item:
  - Do something
  - Pass to next node
```

### Conditional Execution
```javascript
if ($input.json.papers.length > 10) {
  return { status: 'large_batch' };
} else {
  return { status: 'small_batch' };
}
```

### Merge Multiple Inputs
```javascript
const input1 = $input.all()[0].json;
const input2 = $input.all()[1].json;

return {
  ...input1,
  ...input2,
  merged: true
};
```

### Error Handling
```javascript
try {
  // Do something
  const result = JSON.parse($input.json.data);
  return result;
} catch (error) {
  return {
    error: error.message,
    status: 'failed'
  };
}
```

## API Response Format

All workflows should return:

```json
{
  "status": "success",
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
  "reportHighlights": ["string"],
  "confidence": 0.85,
  "processingTimeMs": 45000
}
```

## Debugging Tips

1. **Use Test Webhook** - N8N has test trigger for debugging
2. **Check Logs** - Click on node to see input/output
3. **Print Statements** - Use `return { debug: value }` to inspect
4. **Break Down** - Test one module at a time
5. **Sample Data** - Use small test data for development

## Performance Optimization

- Run modules in parallel where possible
- Use batching for large paper sets
- Cache results if needed
- Monitor memory usage
- Set reasonable timeouts

## Security Notes

- Keep API keys in N8N credentials
- Use environment variables
- Don't expose sensitive data in logs
- Validate input data
- Use HTTPS in production

Good luck building! 🚀
