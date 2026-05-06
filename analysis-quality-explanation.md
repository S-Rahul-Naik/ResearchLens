# Analysis Quality Score Explanation for ResearchLens

This document explains how ResearchLens computes the evaluation metrics shown in the dashboard:
- Topic Coherence
- Topic Coverage
- Gap Novelty
- Model Quality

It also explains the additional summary values such as high-confidence gaps and average papers per topic.

## 1. Metric definitions

### Topic Coherence
- Computed as the average coherence score of all detected topics.
- Each topic already includes a `coherence` value from the topic modeling step.
- Formula:

```text
topicCoherence = sum(topic.coherence for each topic) / number_of_topics
```

- Displayed as a percentage by multiplying the result by 100.
- Example: `0.64` becomes `64%`.

### Topic Coverage
- Measures how many papers were assigned to at least one topic.
- The UI computes it as the fraction of unique assigned papers over the total number of uploaded papers.
- Formula:

```text
topicCoverage = assignedPaperCount / totalPaperCount
```

- In another summary view, it is also computed as the total number of papers referenced by topics divided by the total papers, capped at 1.
- Example: `1.00` becomes `100%`, meaning every paper was assigned to a topic.

### Gap Novelty
- Computed as the average `gapScore` across all detected gaps.
- The score is capped at 1 to remain within a standard percentage range.
- Formula:

```text
gapNovelty = min(1, sum(gap.gapScore for each gap) / number_of_gaps)
```

- Displayed as a percentage. Example: `0.16` becomes `16%`.

### Model Quality
- A composite quality metric that combines coherence, coverage, and gap novelty.
- The evaluation section uses this formula:

```text
modelQuality = round((avgCoherence * 0.4) + (topicCoverage * 0.3) + (gapNovelty * 0.3), 2)
```

- This means:
  - Topic Coherence has the largest influence (40%).
  - Topic Coverage and Gap Novelty each contribute 30%.
- Example: with 64% coherence, 100% coverage, and 16% gap novelty, the model quality is roughly `0.60` or `60%`.

## 2. High-confidence gaps

- The dashboard counts gaps with a `gapScore` greater than `0.5`.
- Formula:

```text
highConfidenceGaps = number of gaps where gap.gapScore > 0.5
```

- In the summary line, this is reported as `0 high-confidence gaps detected (score > 0.5)` when no gap passes that threshold.

## 3. Processing summary values

### Processing completed in live
- The UI shows `live` when the current run is being displayed in real time rather than using an archived timing value.

### Average papers per topic
- Computed from the total paper count divided by the number of detected topics.
- Formula:

```text
avgPapersPerTopic = totalPapers / numberOfTopics
```

- Example: `4.4 papers per topic` means the dataset was split into topics such that each topic contains an average of 4.4 papers.

## 4. Interpreting the example scores

- `Topic Coherence 64%`: topics are moderately coherent; papers within each topic are reasonably aligned.
- `Topic Coverage 100%`: all papers were grouped into topics, so there are no orphan papers.
- `Gap Novelty 16%`: the detected gaps are relatively low in novelty, meaning the topic intersections are not highly surprising.
- `Model Quality 60%`: the overall evaluation is pulled down by the low gap novelty, despite full coverage and moderate coherence.

## 5. Why these metrics matter

- `Topic Coherence` helps you understand whether topics are meaningful and focused.
- `Topic Coverage` checks if the system successfully placed all papers into the topic model.
- `Gap Novelty` suggests how valuable the discovered research gaps are for new directions.
- `Model Quality` summarizes all three metrics into a single quality signal for the analysis pipeline.
