# ResearchLens Topic Modeling Service

This directory contains the Python-backed topic modeling engine used by the backend.

## Stack

- `sentence-transformers` for semantic embeddings
- `BERTopic` for clustering and topic representations
- `KeyBERT` for keyword extraction
- `spaCy` for noun phrase extraction
- `scikit-learn` for fallback clustering and similarity scoring

## Entry point

Run the CLI with JSON on stdin:

```bash
python topic_modeling_cli.py < input.json
```

Expected input shape:

```json
{
  "papers": [
    {
      "id": "P1",
      "title": "...",
      "abstract": "...",
      "content": "...",
      "authors": [],
      "year": 2024
    }
  ]
}
```

The output preserves the backend topic-model contract and adds richer metadata:

- `name`
- `keywords`
- `coherence`
- `labelConfidence`
- `summary`
- `summaryPrompt`
- `representativeTitles`
- `labelStrategy`