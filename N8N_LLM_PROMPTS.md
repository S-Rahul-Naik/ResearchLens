# N8N LLM Node Prompts - Complete Specifications

## Overview
Each LLM node receives:
- `papers`: Original papers array (for reference)
- `question`: User's analysis question
- `papersList`: Formatted full-content papers string
- `papersInfo`: Array of {id, title, year}

Each must output valid JSON matching frontend requirements.

---

## Node 1: Summarization LLM (Gemini 2.5 Flash)
**Generates:** `module1` + `module2` (summary + topics with coherence scores)

### Prompt Template
```
You are analyzing a collection of research papers to identify key findings and research topics.

USER QUESTION:
{question}

PAPERS DATA:
{papersList}

TASK:
1. Summarize the overall key findings from these papers in 2-3 sentences
2. Extract 5-8 main research topics/themes discussed across the papers
3. For each topic, estimate how well the papers discussing it form a coherent theme (0.0 = scattered/incoherent, 1.0 = highly coherent)
4. For each topic, identify which paper IDs discuss it

IMPORTANT: 
- Output ONLY valid JSON, no extra text
- Use the exact paper IDs provided in the papers data
- Coherence scores must be between 0 and 1
- Each topic must have at least one paper ID

OUTPUT JSON STRUCTURE:
{
  "module1": {
    "summary": "2-3 sentence summary of key findings",
    "keyFindings": [
      "Key finding 1",
      "Key finding 2",
      "Key finding 3"
    ],
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  },
  "module2": {
    "topics": [
      {
        "id": "topic_001",
        "name": "Topic Name",
        "coherence": 0.85,
        "paperIds": ["paper_id_1", "paper_id_2"],
        "keywords": ["keyword1", "keyword2"]
      }
    ]
  }
}
```

### Expected Output Example
```json
{
  "module1": {
    "summary": "These papers investigate federated learning architectures for distributed machine learning. Key findings show that privacy-preserving techniques significantly improve model robustness without sacrificing accuracy.",
    "keyFindings": [
      "Federated learning reduces communication overhead by 40-60% compared to centralized approaches",
      "Privacy-preserving techniques enhance model generalization across heterogeneous data distributions",
      "Knowledge graphs improve interpretability of learning models in federated settings"
    ],
    "keywords": ["federated learning", "privacy", "distributed computing", "knowledge graphs", "model robustness"]
  },
  "module2": {
    "topics": [
      {
        "id": "topic_001",
        "name": "Federated Learning Architecture",
        "coherence": 0.92,
        "paperIds": ["paper_001", "paper_003", "paper_005"],
        "keywords": ["federation", "communication", "efficiency"]
      },
      {
        "id": "topic_002",
        "name": "Privacy-Preserving ML",
        "coherence": 0.88,
        "paperIds": ["paper_002", "paper_004"],
        "keywords": ["differential privacy", "encryption", "security"]
      }
    ]
  }
}
```

---

## Node 2: Gap Detection LLM (Gemini 2.5 Flash)
**Generates:** `module3` (research gaps between topic pairs)

### Prompt Template
```
You are analyzing research papers to identify research gaps - areas where two related topics are disconnected or underexplored.

USER QUESTION:
{question}

PAPERS DATA:
{papersList}

TASK:
1. Identify pairs of topics that are related but have limited intersection in the papers
2. For each gap, estimate:
   - Similarity score (0.0 = completely unrelated, 1.0 = essentially the same)
   - Co-occurrence count (how many papers discuss BOTH topics)
   - Gap score (0.0 = well-covered, 1.0 = significant research opportunity)
3. Provide papers discussing topic A, topic B, and bridging papers that discuss both
4. Explain why this gap exists and its research potential

IMPORTANT:
- Output ONLY valid JSON, no extra text
- Use the exact paper IDs provided in the papers data
- All scores (0-1) must be numeric, not percentages
- Gap score should be HIGH (0.7-1.0) for underexplored connections
- Bridging papers are those discussing BOTH topics

OUTPUT JSON STRUCTURE:
{
  "module3": {
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Topic A Name",
        "topicBName": "Topic B Name",
        "topicAKeywords": ["keyword1", "keyword2"],
        "topicBKeywords": ["keyword3", "keyword4"],
        "topicAColor": "#0d9488",
        "topicBColor": "#f59e0b",
        "similarityScore": 0.65,
        "coOccurrenceCount": 2,
        "gapScore": 0.78,
        "papersA": [
          {"id": "paper_001", "title": "Paper Title", "authors": ["Author1", "Author2"], "year": 2023}
        ],
        "papersB": [
          {"id": "paper_002", "title": "Another Paper", "authors": ["Author3"], "year": 2024}
        ],
        "papersBridging": [
          {"id": "paper_003", "title": "Bridging Paper", "authors": ["Author4"], "year": 2023}
        ],
        "explanation": "Why this gap exists and its significance",
        "reliability": 0.85,
        "severity": "moderate"
      }
    ]
  }
}
```

### Expected Output Example
```json
{
  "module3": {
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Federated Learning Architecture",
        "topicBName": "Privacy-Preserving ML",
        "topicAKeywords": ["federation", "communication", "efficiency"],
        "topicBKeywords": ["differential privacy", "encryption"],
        "topicAColor": "#0d9488",
        "topicBColor": "#f59e0b",
        "similarityScore": 0.72,
        "coOccurrenceCount": 1,
        "gapScore": 0.68,
        "papersA": [
          {"id": "paper_001", "title": "Efficient Federated Learning Systems", "authors": ["Smith J.", "Chen X."], "year": 2023},
          {"id": "paper_003", "title": "Communication in Distributed ML", "authors": ["Kumar R."], "year": 2023}
        ],
        "papersB": [
          {"id": "paper_002", "title": "Differential Privacy in ML", "authors": ["Lee S."], "year": 2024}
        ],
        "papersBridging": [
          {"id": "paper_004", "title": "Privacy-Aware Federated Learning", "authors": ["Wong A.", "Park K."], "year": 2023}
        ],
        "explanation": "While both federated learning and privacy techniques are active areas, there is limited exploration of privacy-preserving mechanisms specifically designed for communication-efficient federated systems. This gap represents an opportunity to integrate advanced privacy techniques with bandwidth optimization.",
        "reliability": 0.82,
        "severity": "moderate"
      }
    ]
  }
}
```

---

## Node 3: Trend Detection LLM (Gemini 2.5 Flash)
**Generates:** `module4` (temporal trends for each topic)

### Prompt Template
```
You are analyzing research papers to identify temporal trends in research topics.

USER QUESTION:
{question}

PAPERS DATA:
{papersList}

TASK:
1. For each major research topic, count how many papers discuss it per year
2. Determine the trend: rising (increasing over time), stable (consistent), declining (decreasing), or insufficient_data
3. For each topic, extract:
   - Year-by-year paper counts
   - Overall trend direction
   - LLM analysis of what's driving the trend
   - Key paradigm shifts observed
   - Reliability confidence (0-1)

IMPORTANT:
- Output ONLY valid JSON, no extra text
- Include all years present in the dataset, even years with 0 papers
- Trend must be one of: 'rising', 'stable', 'declining', 'insufficient_data'
- yearlyCounts must include year as integer and count as integer
- llmConfidence should reflect how certain the trend analysis is

OUTPUT JSON STRUCTURE:
{
  "module4": {
    "trends": [
      {
        "topicId": "topic_001",
        "topicName": "Topic Name",
        "trend": "rising",
        "yearlyCounts": [
          {"year": 2020, "count": 2},
          {"year": 2021, "count": 3},
          {"year": 2022, "count": 5}
        ],
        "llmTrendSummary": "This topic shows rapid growth",
        "llmParadigmShifts": ["Shift 1", "Shift 2"],
        "llmReliabilityExplanation": "Based on consistent year-over-year growth",
        "llmConfidence": 0.9
      }
    ]
  }
}
```

### Expected Output Example
```json
{
  "module4": {
    "trends": [
      {
        "topicId": "topic_001",
        "topicName": "Federated Learning Architecture",
        "trend": "rising",
        "yearlyCounts": [
          {"year": 2021, "count": 1},
          {"year": 2022, "count": 2},
          {"year": 2023, "count": 4},
          {"year": 2024, "count": 5}
        ],
        "llmTrendSummary": "Federated learning shows strong upward trajectory with accelerating adoption. From 2021 to 2024, papers on this topic more than quintupled, reflecting growing industrial and academic interest in decentralized learning.",
        "llmParadigmShifts": [
          "Shift from centralized to decentralized ML paradigms",
          "Emergence of privacy-aware federated systems",
          "Integration with edge computing and IoT"
        ],
        "llmReliabilityExplanation": "Trend reliability is high due to consistent 100% year-over-year growth and clear momentum across the entire period. Multiple independent research directions support this trend.",
        "llmConfidence": 0.94
      },
      {
        "topicId": "topic_002",
        "topicName": "Privacy-Preserving ML",
        "trend": "stable",
        "yearlyCounts": [
          {"year": 2021, "count": 1},
          {"year": 2022, "count": 1},
          {"year": 2023, "count": 2},
          {"year": 2024, "count": 1}
        ],
        "llmTrendSummary": "Privacy-preserving ML maintains consistent research interest without significant growth. Research remains at moderate levels with slight fluctuations.",
        "llmParadigmShifts": [
          "Standardization of differential privacy techniques",
          "Focus on practical deployment rather than new methods"
        ],
        "llmReliabilityExplanation": "Trend confidence is moderate due to small sample size and year-to-year volatility, but stability is evident when considering the overall average.",
        "llmConfidence": 0.72
      }
    ]
  }
}
```

---

## Node 4: Visualization LLM (Gemini 2.5 Flash)
**Generates:** `module5` (research map points + coordinates) + `module10` (quality score)

### Prompt Template
```
You are analyzing research papers to generate visualization data and quality metrics.

USER QUESTION:
{question}

PAPERS DATA:
{papersList}

TASK:
1. For each paper, assign X,Y coordinates based on:
   - X-axis: Methodological rigor (0 = theoretical, 100 = highly empirical/experimental)
   - Y-axis: Research novelty (0 = incremental, 100 = highly innovative)
2. Assign each paper to a primary research topic
3. Identify significant gaps between topics for visualization
4. Estimate overall model quality based on:
   - Topic diversity and coverage
   - Gap significance
   - Trend momentum

IMPORTANT:
- Output ONLY valid JSON, no extra text
- X,Y coordinates must be between 0-100
- Use exact paper IDs from the data
- Coordinates should meaningfully separate papers
- Quality score combines topic coverage, gap novelty, and trend strength

OUTPUT JSON STRUCTURE:
{
  "module5": {
    "points": [
      {
        "paperId": "paper_001",
        "title": "Paper Title",
        "x": 75,
        "y": 68,
        "topicId": "topic_001",
        "topicName": "Topic Name",
        "color": "#0d9488",
        "year": 2023
      }
    ],
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Topic A",
        "topicBName": "Topic B",
        "gapScore": 0.78,
        "explanation": "Gap explanation",
        "severity": "moderate"
      }
    ]
  },
  "module10": {
    "honestyScore": 0.82
  }
}
```

### Expected Output Example
```json
{
  "module5": {
    "points": [
      {
        "paperId": "paper_001",
        "title": "Efficient Federated Learning Systems",
        "x": 82,
        "y": 72,
        "topicId": "topic_001",
        "topicName": "Federated Learning Architecture",
        "color": "#0d9488",
        "year": 2023
      },
      {
        "paperId": "paper_002",
        "title": "Differential Privacy in ML",
        "x": 70,
        "y": 65,
        "topicId": "topic_002",
        "topicName": "Privacy-Preserving ML",
        "color": "#f59e0b",
        "year": 2024
      },
      {
        "paperId": "paper_003",
        "title": "Communication in Distributed ML",
        "x": 78,
        "y": 58,
        "topicId": "topic_001",
        "topicName": "Federated Learning Architecture",
        "color": "#0d9488",
        "year": 2023
      },
      {
        "paperId": "paper_004",
        "title": "Privacy-Aware Federated Learning",
        "x": 75,
        "y": 75,
        "topicId": "topic_001",
        "topicName": "Federated Learning Architecture",
        "color": "#0d9488",
        "year": 2023
      },
      {
        "paperId": "paper_005",
        "title": "Knowledge Graphs for ML",
        "x": 72,
        "y": 62,
        "topicId": "topic_003",
        "topicName": "Knowledge Representation",
        "color": "#8b5cf6",
        "year": 2023
      }
    ],
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Federated Learning Architecture",
        "topicBName": "Privacy-Preserving ML",
        "gapScore": 0.68,
        "explanation": "While related, federated learning and privacy techniques are rarely combined. This represents a significant research opportunity.",
        "severity": "moderate"
      },
      {
        "id": "gap_002",
        "topicAId": "topic_002",
        "topicBId": "topic_003",
        "topicAName": "Privacy-Preserving ML",
        "topicBName": "Knowledge Representation",
        "gapScore": 0.82,
        "explanation": "Knowledge graphs could enhance interpretability of privacy-aware models, but this intersection is largely unexplored.",
        "severity": "critical"
      }
    ]
  },
  "module10": {
    "honestyScore": 0.84
  }
}
```

---

## Summary: Copy-Paste Ready HTTP Body for Each Node

### Node 1: Summarization HTTP Body
```javascript
const papers = $input.all()[0]?.json?.papers || [];
const question = $input.all()[0]?.json?.question || 'What are the key findings?';
const papersList = $input.all()[0]?.json?.papersList || '';

const systemPrompt = `You are an expert research analyst specializing in systematic literature review and knowledge synthesis.`;

const userPrompt = `You are analyzing a collection of research papers to identify key findings and research topics.

USER QUESTION:
${question}

PAPERS DATA:
${papersList}

TASK:
1. Summarize the overall key findings from these papers in 2-3 sentences
2. Extract 5-8 main research topics/themes discussed across the papers
3. For each topic, estimate how well the papers discussing it form a coherent theme (0.0 = scattered/incoherent, 1.0 = highly coherent)
4. For each topic, identify which paper IDs discuss it

IMPORTANT: 
- Output ONLY valid JSON, no extra text, no markdown
- Use the exact paper IDs provided in the papers data
- Coherence scores must be between 0 and 1
- Each topic must have at least one paper ID

OUTPUT JSON:
{
  "module1": {
    "summary": "2-3 sentence summary of key findings",
    "keyFindings": ["finding1", "finding2", "finding3"],
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "module2": {
    "topics": [
      {
        "id": "topic_001",
        "name": "Topic Name",
        "coherence": 0.85,
        "paperIds": ["paper_id_1", "paper_id_2"],
        "keywords": ["keyword1", "keyword2"]
      }
    ]
  }
}`;

return {
  resource: "genAI",
  operation: "messageCreate",
  model: "gemini-2.5-flash",
  options: {
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ],
    systemPrompt: systemPrompt
  }
};
```

### Node 2: Gap Detection HTTP Body
```javascript
const papers = $input.all()[0]?.json?.papers || [];
const question = $input.all()[0]?.json?.question || 'What are the research gaps?';
const papersList = $input.all()[0]?.json?.papersList || '';

const systemPrompt = `You are an expert research analyst specializing in identifying research gaps and opportunities.`;

const userPrompt = `You are analyzing research papers to identify research gaps - areas where two related topics are disconnected or underexplored.

USER QUESTION:
${question}

PAPERS DATA:
${papersList}

TASK:
1. Identify pairs of related but disconnected topics
2. For each gap, estimate similarity (0-1), co-occurrence count, and gap score (0-1, high = significant opportunity)
3. Categorize papers: papersA (topic A only), papersB (topic B only), papersBridging (both)
4. Provide explanations and severity levels

IMPORTANT: 
- Output ONLY valid JSON, no extra text, no markdown
- All scores (0-1) must be numeric
- Gap score HIGH (0.7-1.0) for underexplored connections
- Use exact paper IDs from papers data

OUTPUT JSON:
{
  "module3": {
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Topic A",
        "topicBName": "Topic B",
        "topicAKeywords": ["kw1"],
        "topicBKeywords": ["kw2"],
        "topicAColor": "#0d9488",
        "topicBColor": "#f59e0b",
        "similarityScore": 0.65,
        "coOccurrenceCount": 2,
        "gapScore": 0.78,
        "papersA": [{"id": "paper_001", "title": "Title", "authors": ["Author"], "year": 2023}],
        "papersB": [{"id": "paper_002", "title": "Title", "authors": ["Author"], "year": 2024}],
        "papersBridging": [{"id": "paper_003", "title": "Title", "authors": ["Author"], "year": 2023}],
        "explanation": "Why this gap exists",
        "reliability": 0.85,
        "severity": "moderate"
      }
    ]
  }
}`;

return {
  resource: "genAI",
  operation: "messageCreate",
  model: "gemini-2.5-flash",
  options: {
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ],
    systemPrompt: systemPrompt
  }
};
```

### Node 3: Trend Detection HTTP Body
```javascript
const papers = $input.all()[0]?.json?.papers || [];
const question = $input.all()[0]?.json?.question || 'What are the trends?';
const papersList = $input.all()[0]?.json?.papersList || '';

const systemPrompt = `You are an expert research analyst specializing in temporal trend analysis and research trajectory forecasting.`;

const userPrompt = `You are analyzing research papers to identify temporal trends in research topics.

USER QUESTION:
${question}

PAPERS DATA:
${papersList}

TASK:
1. For each major topic, count papers per year
2. Determine trend: rising, stable, declining, or insufficient_data
3. Extract yearly counts, paradigm shifts, and trend explanations

IMPORTANT: 
- Output ONLY valid JSON, no extra text, no markdown
- Trend must be: rising, stable, declining, or insufficient_data
- Include all years in dataset, even with 0 papers
- yearlyCounts: year (integer), count (integer)

OUTPUT JSON:
{
  "module4": {
    "trends": [
      {
        "topicId": "topic_001",
        "topicName": "Topic Name",
        "trend": "rising",
        "yearlyCounts": [
          {"year": 2020, "count": 2},
          {"year": 2021, "count": 3}
        ],
        "llmTrendSummary": "Summary of trend",
        "llmParadigmShifts": ["Shift1", "Shift2"],
        "llmReliabilityExplanation": "Why reliable",
        "llmConfidence": 0.9
      }
    ]
  }
}`;

return {
  resource: "genAI",
  operation: "messageCreate",
  model: "gemini-2.5-flash",
  options: {
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ],
    systemPrompt: systemPrompt
  }
};
```

### Node 4: Visualization & Quality HTTP Body
```javascript
const papers = $input.all()[0]?.json?.papers || [];
const question = $input.all()[0]?.json?.question || 'What is the research landscape?';
const papersList = $input.all()[0]?.json?.papersList || '';

const systemPrompt = `You are an expert research analyst specializing in research landscape visualization and quality assessment.`;

const userPrompt = `You are analyzing research papers to generate visualization data and quality metrics.

USER QUESTION:
${question}

PAPERS DATA:
${papersList}

TASK:
1. For each paper, assign X (0-100: methodological rigor) and Y (0-100: novelty) coordinates
2. Assign each paper to a primary research topic
3. Identify major gaps for visualization
4. Estimate overall model quality (0-1)

IMPORTANT: 
- Output ONLY valid JSON, no extra text, no markdown
- X,Y coordinates: integers 0-100
- Use exact paper IDs from data

OUTPUT JSON:
{
  "module5": {
    "points": [
      {
        "paperId": "paper_001",
        "title": "Title",
        "x": 75,
        "y": 68,
        "topicId": "topic_001",
        "topicName": "Topic Name",
        "color": "#0d9488",
        "year": 2023
      }
    ],
    "gaps": [
      {
        "id": "gap_001",
        "topicAId": "topic_001",
        "topicBId": "topic_002",
        "topicAName": "Topic A",
        "topicBName": "Topic B",
        "gapScore": 0.78,
        "explanation": "Gap explanation",
        "severity": "moderate"
      }
    ]
  },
  "module10": {
    "honestyScore": 0.82
  }
}`;

return {
  resource: "genAI",
  operation: "messageCreate",
  model: "gemini-2.5-flash",
  options: {
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ],
    systemPrompt: systemPrompt
  }
};
```

---

## N8N Configuration Summary

1. **Prepare Input Node**: Uses enhanced JavaScript code (from previous conversation)
2. **Summarization HTTP Node**: 
   - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{env.GEMINI_API_KEY_1}}`
   - Body: Copy from "Node 1" above
   - Delay: 0s
3. **Gap Detection HTTP Node**:
   - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{env.GEMINI_API_KEY_2}}`
   - Body: Copy from "Node 2" above
   - Delay: 1s
4. **Trend Detection HTTP Node**:
   - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{env.GEMINI_API_KEY_3}}`
   - Body: Copy from "Node 3" above
   - Delay: 2s
5. **Visualization HTTP Node**:
   - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{env.GEMINI_API_KEY_4}}`
   - Body: Copy from "Node 4" above
   - Delay: 3s
6. **Merge Results Node**: Combines all module outputs into single JSON
7. **Respond to Webhook Node**: Returns merged JSON to frontend

All prompts force JSON-only output with no markdown wrapper, ensuring frontend receives clean, parseable JSON.
