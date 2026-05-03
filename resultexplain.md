# ResearchLens — Analysis Results Explained

---

## Is the data real or mocked?

**All analysis results are REAL** — computed live from your uploaded PDFs using NLP algorithms.
No hardcoded demo results. Every number, topic, gap, and trend comes from actual paper text.

---

## Processing Pipeline

When you click "Process Papers", the system runs 5 stages per paper:

| Stage | What it does |
|-------|-------------|
| **Upload** | Receives and validates the PDF file |
| **Extract** | Parses the PDF and extracts raw text (title, abstract, authors, year, full content) |
| **Embed** | Converts text into TF-IDF numerical vectors (a way to represent words as numbers) |
| **Cluster** | Groups papers into topics using k-means clustering on the vectors |
| **Gaps** | Detects research gaps by comparing topic similarity vs how often topics co-appear |

---

## Section 1 — Dataset Summary

**Think of this as a quick health check of your paper collection.**

| What it shows | What it means in plain English |
|-------|----------|
| **Total Papers** | How many papers you uploaded (your collection size) |
| **Topics Detected** | How many different research themes the system found by automatically grouping similar papers |
| **Gaps Identified** | How many "missing connections" exist — places where two topics are related but no papers study them together yet |
| **Year Range** | What years your papers span (e.g., 2015–2023). Shows if your collection is recent or historical |
| **Topic Coherence** | Are papers in the same topic actually about the same thing? 100% = yes, perfectly focused. 50% = mixed bag, less focused |
| **Topic Coverage** | Did the system successfully group ALL papers into topics? 100% = yes, no orphans. 95% = 5 papers didn't fit any group |
| **Gap Novelty** | Are the detected gaps interesting/surprising? Higher = more novel research opportunities, not obvious intersections |
| **Model Quality** | Overall score: "How good is this analysis?" Combines coherence + coverage + gap novelty into one number |

---

## Section 2 — Topic Modeling Results

### What is a topic? (Simple Version)
**Imagine sorting your papers into piles on a table based on similarity.**

The system reads every page of every PDF you uploaded. It then groups papers that discuss similar ideas together. Each pile is a **topic**. The name comes from the 3 most common keywords in that pile.

Example: If a pile of papers all discuss federated learning, language models, and dialogue systems, it gets called "language / dialog / federated".

### What gets extracted from your PDFs?
**The system is very thorough — it reads:**
- ✅ Every word in the main paper (all pages, front to back)
- ✅ Tables and their numbers
- ✅ Image captions and descriptions
- ✅ Equations (as text)
- ✅ References and citations
- ✅ Headers and footnotes
- ❌ **NOT** images/graphs themselves (PDFs only let us read the text layer, not rendered graphics)

**Real example:** The GPT-3 paper (75 pages) — system extracted 238,616 characters. That's the ENTIRE paper, end-to-end.

### What are keywords?
**The most common meaningful words in a topic's papers.**

But not just ANY words — the system filters out generic words like "model", "data", "learning" that appear everywhere. It keeps only domain-specific words that actually describe what the topic is about.

### What was "+5 more"?
**The old UI was hiding keywords.** It showed only 5 keywords but there were 10. **Now fixed** — all keywords display.

### Trend Labels: Is a topic Growing, Flat, or Shrinking?
**The system looks at WHEN papers were published** to detect trends:

| Trend | What it means | Example |
|-------|--------------|----------|
| **Rising ⬆️** | More papers published recently = this area is hot now | Federated Learning: 2 papers in 2020, 8 papers in 2023 |
| **Stable ➡️** | Steady papers every year = consistent research area | Knowledge Graphs: 1-2 papers per year since 2018 |
| **Declining ⬇️** | Fewer papers recently = research interest peaked earlier | ResNet/U-Net (vision): many papers in 2015, none since 2018 |

**How it works:** Takes publication years, draws a line through them (math: linear regression), checks if line goes up, stays flat, or goes down.

---

## Section 3 — Gap Detection Results

### What is a research gap? (Simple Version)
**A gap is an unexplored intersection between two research areas.**

Imagine two circles:
- **Circle A:** Federated Learning papers
- **Circle B:** Large Language Model papers

If the circles **overlap in meaning** (both about decentralized ML) but there are **NO papers in the overlapping region**, that's a gap.

**Why does this matter?** → Gap = research opportunity. If nobody has studied it, that's where YOU could publish something novel.

### How does the system detect gaps?
**Step 1:** Check if two topics are related (do their keywords overlap?)
**Step 2:** Count how many papers study BOTH topics together
**Step 3:** Score it — high relatedness + low co-occurrence = strong gap

### Gap Scores Explained
**0.8–1.0 = Very strong gap** (urgent research opportunity)
- Topics are related BUT completely unstudied together
- Example: "Federated Learning" + "Vision Transformers" (related fields, but barely any papers together)

**0.5–0.7 = Strong gap** (good research opportunity)
- Topics are related, only a few papers bridge them

**0.2–0.4 = Weak gap** (less interesting)
- Topics are related but already fairly well-connected, OR topics are only loosely related

**< 0.2 = Not really a gap** (either unrelated topics or already well-covered)

---

## Section 4 — Trend Analysis Results

### What does this section show?
**How popular is each research topic getting year-by-year?**

Think of it like a stock chart for research areas:
- **Going up** = more researchers are publishing in this area (it's trending)
- **Flat line** = same interest level every year
- **Going down** = research interest is dying out

### What do the numbers mean?
**Peak Year:** The year when this topic had the MOST papers published. Shows when research in this area was at maximum hype.

**Growth %:** How much did the topic grow overall? 
- If it went from 1 paper in 2015 to 5 papers in 2023 → **+400% growth**
- Shows if this is an old, stable topic or a new, explosive area

**Bar chart:** Each bar = how many papers published that year. Visual way to spot patterns quickly.

### Real Example
- **Federated Learning:** 0 papers 2019 → 8 papers 2023 = **Rising trend** 📈 (hot area now)
- **ResNet/Vision (2015 classics):** 4 papers 2015 → 0 papers 2023 = **Declining trend** 📉 (past its peak)

---

## Section 5 — Research Map Visualization

### What are you looking at?
**A bird's-eye view of your entire research landscape.**

Imagine zooming up 30,000 feet and looking down at ALL your papers at once, organized by how they relate to each other.

### How to read it

**🔵 Colored dots** = Each dot is one paper.
- Color = which topic it belongs to
- Position = how similar it is to nearby papers
- Papers on the **same idea cluster together**
- Papers on **different ideas drift apart**

**⭕ Large circles with glow rings** = Topic centroids (the "center of gravity" for each topic)
- They mark where the center of each topic cluster is
- The larger circle = heart of that research area

**---  Red dashed lines** = Research gaps (the opportunities)
- Red line = two topics that should connect but don't
- No bridging papers between them yet
- **This is where future research could happen**

### What patterns matter?
**Tight clusters** = Well-researched area (lots of papers, they're all similar)
**Scattered dots** = Frontier area (few papers, isolated research)
**Red lines far apart** = Major gaps (completely separate fields that could be connected)

---

## Section 6 — Chat Results (RAG Output)

RAG = **Retrieval-Augmented Generation**

How it works:
1. Your question is converted to a TF-IDF vector
2. The system finds the most semantically relevant paper chunks (not the whole paper)
3. Those chunks are assembled as context
4. The answer is synthesised from that context

**Citation relevance %** = how strongly each paper chunk influenced the answer.

This is real — the answers come from your actual uploaded paper content, not from an external AI model.

---

## Section 7 — Evaluation Summary

| Metric | What it measures |
|--------|-----------------|
| **Dataset Size** | Total papers processed |
| **Topics** | Number of k-means clusters found |
| **Gaps** | Total gaps detected |
| **High-Conf Gaps** | Gaps with score > 0.5 (most actionable) |
| **Topic Coherence** | Avg semantic similarity within clusters |
| **Topic Coverage** | % papers assigned to a topic (100% = no unclustered papers) |
| **Gap Novelty Score** | How non-obvious the gaps are |
| **Overall Model Quality** | Weighted composite of all above metrics |
| **Coherence by Topic** | Per-topic coherence breakdown |
| **Gap Score Distribution** | Histogram of all gap scores — ideally concentrated in 0.6–1.0 range |

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| "parsing / pdf / content" artifact topic | One PDF had failed text extraction — raw metadata leaked into corpus | PDF parser now validates that fallback content contains actual words |
| All papers collapsing into one topic | Generic ML words (model, data, learning) dominated all papers | Expanded stopword list to filter ~40 generic ML/research terms |
| "+5 more" on keywords | UI was truncating keywords array to first 5 | Removed `.slice(0, 5)` — all keywords now shown |
| Research map showing only 1 dot | Visualization didn't handle unassigned papers properly | Fixed topic assignment fallback and cluster positioning |
| Logout on page reload | Auth session check happened after route guard redirect | Added `isAuthInitializing` state — dashboard waits for token restore before redirecting |
| CORS error on signup | Backend only allowed `localhost:3001`, frontend was on `:3000` | Updated CORS to allow both `localhost:3000` and `localhost:3001` |
| Backend data lost on restart | Papers stored only in-memory | 20 base papers now seeded to MongoDB + Cloudinary on startup; user uploads saved to MongoDB |
