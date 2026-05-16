# ResearchLens — Presentation Pitch

A concise pitch deck content summarizing each slide for a 13-slide presentation.

---

## Slide 1 – TITLE SLIDE

Title: ResearchLens
Subtitle: A Comprehensive AI-Powered Research Intelligence Platform

- Institution/Organization: [Your Organization]
- Presented by: [Your Name]
- Date: May 2026
- One-liner: Automating literature analysis, gap detection, trend discovery, and research Q&A.

---

## Slide 2 – INTRODUCTION

What is ResearchLens?

- Full-stack platform to ingest, analyze, and visualize academic papers.
- Key features: paper ingestion, topic modeling, gap detection, trend analysis, chatbot Q&A, visualizations, scientific honesty evaluation.
- Target users: researchers, PhD students, research organizations.

Presenter note: Emphasize value proposition and who benefits.

---

## Slide 3 – EXISTING SYSTEM & RESEARCH GAP

Current challenges:

- Manual literature review is slow and inconsistent.
- Gap identification lacks automation and scale.
- Trend detection is ad-hoc and not real-time.

ResearchLens fills gaps by providing systematic, automated analysis and visual insights.

Presenter note: Use a short table or 3 bullets highlighting problems and how ResearchLens addresses them.

---

## Slide 4 – PROBLEM STATEMENT

Core problems:

- Information overload from growing paper volume.
- Inefficient, subjective gap detection.
- Disconnected tools and workflows.

Solution: An integrated AI platform that automates analysis, finds gaps, tracks trends, and provides an intelligent research assistant.

---

## Slide 5 – OBJECTIVES

Primary objectives (short bullets):

1. Automated paper ingestion and extraction
2. Topic modeling with BERTopic
3. Gap detection and recommendations
4. Trend analysis and forecasting
5. Chatbot Q&A over the corpus
6. Scientific honesty evaluation
7. Workflow orchestration and dashboarding

---

## Slide 6 – LITERATURE SURVEY

Key references and concepts:

- BERTopic, BERT, SBERT for topic modeling and embeddings
- UMAP and HDBSCAN for dimensionality reduction and clustering
- spaCy for NLP preprocessing
- LLMs (Ollama, OpenAI, Gemini) for Q&A and summarization
- n8n for workflow orchestration

Presenter note: Mention 3–4 most influential papers/tools.

---

## Slide 7 – METHODOLOGY

Development phases and approach:

- Phase 1: Requirements & architecture
- Phase 2: Core infrastructure (backend, frontend, DB)
- Phase 3: Module development (summarization, topic modeling, gap detection, trend detection, visualization, chatbot, honesty evaluator)
- Phase 4: Integration, orchestration (n8n), optimization
- Phase 5: Testing & deployment

---

## Slide 8 – SYSTEM ARCHITECTURE EXPLANATION

High-level architecture (3-tier):

- Frontend: React + Vite dashboard and chatbot UI
- Backend: Express API, module services, auth
- Python services: BERTopic, spaCy, analysis engines
- Database: MongoDB storing papers and analysis results
- Optional: n8n, Ollama, cloud AI APIs

Presenter note: Show simplified diagram and call out data flow.

---

## Slide 9 – WORKFLOW EXECUTION

Pipeline steps (concise):

1. Paper ingestion: upload → parse → store
2. Preprocessing: tokenization, lemmatization, embeddings
3. Module execution: summarization, topic modeling, gap detection, trend analysis, visualization, chatbot, honesty checks
4. Results stored and visualized in dashboard
5. Optional: n8n orchestrates and schedules workflows

---

## Slide 10 – SYSTEM REQUIREMENTS

Hardware: CPU 2+ cores (rec), RAM 8–16 GB (rec 16+), SSD storage
Software:
- Node.js v20+, Python 3.8+, MongoDB
- Optional: Docker, Ollama (local LLM), n8n
Dependencies summary: BERTopic, spaCy, sentence-transformers, Express, Mongoose

---

## Slide 11 – RESULTS

Highlights and metrics:

- 7 core modules implemented
- Processing speed: ~50 papers/min (example)
- Topics discovered and gaps identified (example metrics)
- Dashboard responsiveness and UX scores
- Quality indicators: test coverage and API performance

Include one short example: e.g., "From 500 papers: 25 topics, 12 gaps, 5 emerging trends."

---

## Slide 12 – CONCLUSION

Summary:

- ResearchLens automates literature analysis and provides actionable insights.
- Benefits: time savings, systematic gap detection, trend awareness.
- Future work: multi-language support, citation network analysis, federation.

Call to action: Pilot with a research group or integrate with institutional corpus.

---

## Slide 13 – REFERENCES

Short curated list:

- Grootendorst, M. (2022) — BERTopic
- Devlin et al. (2018) — BERT
- McInnes et al. (2018) — UMAP
- spaCy documentation
- Ollama / OpenAI / Gemini docs

---

## Presenter Notes & Timing

- Total talk: ~25–30 minutes
- Suggested timing: 1–3 min per slide, longer for architecture/workflow and results
- Demo suggestions: live upload → run analysis → show dashboard and chatbot

---

*File generated: presentation_pitch.md*