# Explainable AI Dashboard Components Guide

## Project Overview (Context)

### Title
Explainable AI System for Research Gap Detection and Emerging Topic Analysis

### Core problem addressed
Researchers struggle to manually review rapidly growing literature, identify meaningful gaps, track emerging topics, and query their own corpus with grounded evidence.

### Core idea used by this system
A research gap is modeled as two semantically similar topics with low co-occurrence, then explained with measurable evidence (similarity, co-occurrence, and supporting papers).

### Why this dashboard exists
The dashboard is the operational UI layer that turns embedding, clustering, gap detection, trend analysis, map projection, and RAG QA into an explainable end-to-end workflow.

---

## Dashboard Shell

### 1) Dashboard Page Container
- File: src/pages/dashboard/page.tsx
- Consists of:
  - Sidebar navigation
  - Top bar
  - Main section renderer (Overview, Datasets, Gap Detection, Topic Explorer, Trend Analysis, Research Map, AI Chatbot)
  - Results full-screen overlay
  - Analysis history panel
- Why keep it:
  - Acts as orchestration layer for the whole dashboard.
  - Centralizes section routing/state and preserves a consistent UX frame.
  - Connects analysis runs to history and results without page reload.

### 2) Sidebar
- File: src/pages/dashboard/components/Sidebar.tsx
- Consists of:
  - Workspace navigation entries
  - Records area (Analysis History trigger + badge)
  - User identity and logout
- Why keep it:
  - Gives stable task navigation across all analysis modules.
  - Keeps primary workflow (datasets -> gaps/topics/trends/map/chat) one click away.
  - Preserves session awareness with analysis history count.

### 3) Top Bar
- File: src/pages/dashboard/components/TopBar.tsx
- Consists of:
  - Contextual section title/subtitle
  - Search input
  - Quick action buttons: snapshots, analysis history, export history
  - Related panels (ExportHistoryPanel, SnapshotsPanel, AnalysisHistoryPanel)
- Why keep it:
  - Keeps global actions available independent of selected section.
  - Improves explainability and reproducibility via snapshots/history.

---

## Sidebar Pages: What They Contain and Why They Are Kept

### 1) Overview
- Main file: src/pages/dashboard/sections/OverviewSection.tsx
- Consists of:
  - Key stats cards (papers, topics, gaps, average gap score)
  - Latest run summary banner
  - Top research gaps preview
  - Recent papers panel
  - Topic distribution cards with trend indicators
- Why keep it:
  - Provides fast situational awareness before deep analysis.
  - Supports your objective of reducing manual effort by surfacing high-value findings first.

### 2) Datasets
- Main file: src/pages/dashboard/sections/DatasetsSection.tsx
- Consists of:
  - Paper management list and filtering/sorting
  - Processing trigger for analysis pipeline
  - Pipeline modal integration
  - Export helpers (JSON/CSV/print)
  - Run metadata creation for downstream results/history
- Why keep it:
  - This is the intake and execution gateway for the entire AI workflow.
  - Connects user-uploaded corpus to explainable analysis outputs.

### 3) Gap Detection
- Main file: src/pages/dashboard/sections/GapsSection.tsx
- Consists of:
  - Gap cards ranked by score
  - Filter controls (similarity, gap score, sorting)
  - Select mode for compare/export
  - Gap detail side panel and compare modal
  - Export (JSON/PDF)
- Why keep it:
  - This is the core value component tied directly to your problem statement.
  - Makes gap reasoning transparent with score, similarity, co-occurrence, and evidence.

### 4) Topic Explorer
- Main file: src/pages/dashboard/sections/TopicsSection.tsx
- Consists of:
  - Topic exploration UI
  - Topic detail modal with keywords and linked papers
  - Topic compare modal (overlap, shared papers, trend alignment)
- Why keep it:
  - Supports explainability by exposing cluster semantics and paper-level grounding.
  - Helps verify that gap candidates are meaningful, not random noise.

### 5) Trend Analysis
- Main file: src/pages/dashboard/sections/TrendsSection.tsx
- Consists of:
  - Trend cards with mini time-series charts
  - Growth labels (rising/stable/declining)
  - Timeline annotations (first-study and bridge events)
  - Trend filtering by status
- Why keep it:
  - Directly addresses your objective for emerging topic detection.
  - Adds temporal evidence so decisions are not based on static snapshots.

### 6) Research Map
- Main file: src/pages/dashboard/sections/MapSection.tsx
- Consists of:
  - 2D topic/paper map (UMAP-like projection view)
  - Centroid and gap-line visualization controls
  - Citation view mode and citation edge highlighting
  - Export options (DOT/JSON graph outputs)
- Why keep it:
  - Translates complex relationships into interpretable spatial structure.
  - Supports explainability and discovery of sparse/under-explored regions.

### 7) AI Chatbot
- Main file: src/pages/dashboard/sections/ChatbotSection.tsx
- Consists of:
  - Session list and active chat panel
  - Prompt input and quick suggestions
  - Answer generation with citation blocks and relevance bars
  - Loading states and message formatting
- Why keep it:
  - Delivers natural language interaction over the corpus.
  - Aligns with your RAG objective: grounded responses with evidence.

---

## Supporting Analysis Pages (Not Current Sidebar Entries)

### Results Overlay
- Main file: src/pages/dashboard/sections/ResultsSection.tsx
- Consists of:
  - Unified output sections: dataset, topics, gaps, trends, map, chat, evaluation summary
  - Methodology panel (step-by-step explainability)
  - Save snapshot modal and snapshots panel integration
  - Share/print/export style utilities
- Why keep it:
  - Consolidates pipeline outputs into one evidence report view.
  - Critical for presenting explainable end-to-end analysis in academic settings.

### Evaluation Section
- Main file: src/pages/dashboard/sections/EvaluationSection.tsx
- Consists of:
  - Circular metric cards (coherence, coverage, novelty, model quality)
  - Dataset and gap detection performance stats
  - Co-occurrence matrix visualization
- Why keep it:
  - Provides transparent model quality indicators.
  - Supports defendability of results using quantitative diagnostics.

---

## Key Reusable Components in Dashboard Flow

### Processing Pipeline Modal
- File: src/pages/dashboard/sections/datasets/ProcessingPipeline.tsx
- Role:
  - Simulates staged processing (upload -> extract -> embed -> cluster -> detect gaps)
  - Provides progress visibility and completion callback to results workflow
- Why keep it:
  - Makes analysis lifecycle observable and understandable for users.

### Analysis History Panel
- File: src/pages/dashboard/components/AnalysisHistoryPanel.tsx
- Role:
  - Lists saved runs and lets users reopen past results
- Why keep it:
  - Supports reproducibility and iterative research workflow.

### Snapshots and Export History Panels
- Files:
  - src/pages/dashboard/components/SnapshotsPanel.tsx
  - src/pages/dashboard/components/ExportHistoryPanel.tsx
- Role:
  - Track checkpoints and generated outputs
- Why keep them:
  - Strengthen traceability, reporting, and explainable auditability.

---

## Data and Hooks Layer (Why It Matters)

### Hooks
- src/hooks/useAnalysisHistory.tsx
- src/hooks/useSnapshots.tsx
- src/hooks/useExportHistory.tsx
- src/hooks/useAuth.tsx

These keep dashboard state persistent and structured (runs, snapshots, exports, user auth), which is essential for practical explainable analysis workflows.

### Mock Data Sources (current implementation)
- src/mocks/papers.ts
- src/mocks/topics.ts
- src/mocks/gaps.ts
- src/mocks/trends.ts
- src/mocks/evaluation.ts
- src/mocks/mapData.ts
- src/mocks/chatData.ts
- src/mocks/citations.ts

These files provide deterministic sample outputs for each analysis layer and make UI behavior testable before full backend integration.

---

## Summary

Your dashboard is structured correctly for your proposed system:
- Datasets section handles corpus intake and pipeline kickoff.
- Gap Detection is the core explainable value module.
- Topic, Trend, and Map sections provide multi-layer evidence.
- Chatbot provides grounded interaction over corpus knowledge.
- Results, Evaluation, History, Snapshots, and Export support transparency and academic defendability.
