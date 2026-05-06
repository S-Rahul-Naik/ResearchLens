# Gap Detection Explanation for ResearchLens

This document explains how ResearchLens finds research gaps between detected topics.
It shows what input the system uses, how it computes gap strength, and gives an example.

## 1. What input does the system use?

The gap detection module works from two inputs:

1. `papers` — the uploaded research papers.
   Each paper includes:
   - `id`
   - `title`
   - `year`
   - `abstract`
   - `content`

2. `topics` — the topic groups discovered by Module 2.
   Each topic includes:
   - `topicId`
   - `name`
   - `keywords`
   - `paperIds`

So the gaps are not pre-defined. They are discovered from the actual papers and topic keywords.

## 2. How does gap detection work?

### Step 1: Build topic keyword vectors

The system first collects every keyword from every topic.
It builds a vocabulary from those keywords and then converts each topic into a vector.
Each topic vector is a simple frequency vector over the shared vocabulary.

### Step 2: Compare topic similarity

For every pair of topics, the system computes cosine similarity between their keyword vectors.
This measures how related the two topics are based on shared keyword meaning.

### Step 3: Find papers that belong to both topics

For each paper, the system checks how strongly it belongs to each topic:
- It tokenizes the paper text (`abstract + content`) using a tokenizer that removes stop words and noise.
- It computes a membership score for topic A and topic B separately, based on keyword overlap.
- A paper is considered a joint paper for that topic pair if it scores at least `0.2` for both topics.

This is how the system finds evidence papers that bridge both topics.

### Step 4: Compute co-occurrence and normalized co-occurrence

- `coOccurrence` = number of papers that belong to both topics.
- `normalizedCoOcc` = `coOccurrence / total number of papers`

A gap is stronger when the topics are related but very few papers actually cover both.

### Step 5: Compute the gap score

The gap score formula is:

```text
gapScore = similarity(topicA, topicB) * (1 - normalizedCoOccurrence)
```

This means:
- If two topics are unrelated, the gap is not meaningful.
- If two topics are related but have few joint papers, the gap becomes stronger.
- If two topics are related and already well-bridged by many papers, the gap is weaker.

### Step 6: Keep only topic pairs that are sufficiently related

The system only creates gaps when the topic similarity is at least `0.15`.
That filters out topic pairs that are too distant to be considered a meaningful research gap.

### Step 7: Assign severity

Once a gap is created, it is labeled with severity:
- `critical` if `gapScore >= 0.5`
- `moderate` if `gapScore >= 0.3`
- `low` otherwise

## 3. What does `0 zero co-occurrence` mean?

In the dashboard summary, `0 zero co-occurrence` means:
- There are no topic pairs with exactly zero joint papers among the ones that passed the similarity threshold.
- In other words, every detected gap pair has at least one paper that overlaps both topics.

That is still useful: the gap may exist because there are very few bridge papers, not because there are none at all.

## 4. Example

### Input topics

Consider two detected topics:

- Topic A: `Neural Architecture Search`
  - Keywords: `search`, `architecture`, `cnn`, `automated`, `design`
- Topic B: `Medical Image Segmentation`
  - Keywords: `segmentation`, `medical`, `image`, `tumor`, `ct`

### Step A: Compute similarity

The system vectorizes both keyword sets and computes cosine similarity.
If the topics share some domain words like `image` or `architecture`, similarity may be moderate.

### Step B: Find joint papers

Suppose the paper collection contains 20 papers.
The system tokenizes each paper and checks whether it has enough keywords from both topics.
If 1 paper is judged to belong to both topics, then:
- `coOccurrence = 1`
- `normalizedCoOcc = 1 / 20 = 0.05`

### Step C: Compute gap score

If the topic similarity is `0.4`, then:

```text
gapScore = 0.4 * (1 - 0.05) = 0.4 * 0.95 = 0.38
```

This gap would be labeled as `moderate` because it is between `0.3` and `0.5`.

### Why it is still a gap

Even though one paper bridges the topics, the pair is still a gap because:
- the topics are related, and
- very few papers connect them.

That suggests the intersection is underexplored.

## 5. What the output contains

Each detected gap includes:
- `gapId`
- `topicA` and `topicB`
- `topicALabel` and `topicBLabel`
- `similarity`
- `coOccurrence`
- `gapScore`
- `severity`
- `evidencePaperIds`
- `recommendation`

So the dashboard summary `Gaps Identified` counts how many topic pairs were considered gaps.

## 6. Why this matters

A gap is not just a difference between topics.
It is a related topic pair with weak paper overlap.
That makes it a strong candidate for a new research direction.

---

### File saved
`gap-analysis-explanation.md` has been created in the project root with this detailed explanation and example.
