# Section 7 — Evaluation Summary Explained

This document explains Section 7 of ResearchLens in simple Feynman-style language.
It walks through every number and chart in the Evaluation Summary, using the actual implementation logic from the app.

## 1. What Section 7 is trying to do

Section 7 is a scorecard for the whole analysis pipeline.
It answers questions like:
- Did we group papers into reasonable topics?
- Did we assign most papers to a topic?
- Are the discovered gaps meaningful?
- How good is the whole model overall?

The section is built from data produced by the topic, gap, and map modules.
It is not a random dashboard — it computes these numbers from the actual paper assignments and gap scores.

## 2. The four core summary cards

The top cards are:
- `Dataset Size`
- `Topics`
- `Gaps`
- `High-Conf Gaps`

These are simple counts.

### Example values
- `22` papers were processed.
- `5` topics were detected.
- `1` gap was identified.
- `0` high-confidence gaps were found.

### What they mean
Think of the dataset like a room of books:
- `Dataset Size` is how many books are on the floor.
- `Topics` is how many piles the books were sorted into.
- `Gaps` is how many interesting missing connections the system found between piles.
- `High-Conf Gaps` is how many of those missing connections are very strong, score above `0.5`.

So this example says: the pipeline found 5 topic piles, only 1 gap between topics, and none of those gaps were very strong.

## 3. Topic Coherence

This is the system's measure of how consistent each topic is.
In code, it is calculated like this:

```text
avgCoherence = average(topic.coherence for each topic)
```

Each topic already has a `coherence` score from topic detection.
The dashboard shows it as a percentage.

### Example value
- `64%` means the topics are moderately consistent.

### Feynman example
Imagine each topic is a shoe box.
Topic coherence asks: are the shoes in this box really the same type?
- `100%` means every shoe in the box is clearly the same style.
- `64%` means the box is mostly consistent, but some shoes are a little different.

So with `64%`, the system is saying: “Most papers in each topic belong together, but some topics still contain slightly mixed material.”

## 4. Topic Coverage

Topic Coverage measures whether the papers were actually assigned to topics.
In code, it is:

```text
topicCoverage = min(1, total number of paper references inside topics / total papers)
```

That means the system counts all papers that appear inside the topic groups and divides by the total paper count.
It caps the result at `1.0`.

### Example value
- `100%` coverage means every uploaded paper was assigned to at least one topic.

### Feynman example
If the room has 22 books and each book is placed into some pile, then coverage is `100%`.
If 2 books were left on the floor, coverage would be `91%`.

So in this output, the system did not leave any paper ungrouped.

## 5. Gap Novelty Score

Gap Novelty is the average strength of all detected gaps.
In code, it is:

```text
gapNovelty = min(1, average(gap.gapScore for each gap))
```

Each gap has a score between `0` and `1`.
A higher average means the gaps are more surprising or interesting.

### Example value
- `16%` means the gaps are weak and not very novel.

### Feynman example
Think of gaps as bridges you want to build between two walls.
- A `90%` gap means the wall pair is a very compelling place to build a bridge.
- A `16%` gap means the gap exists, but it is not a strong or exciting opportunity.

So, with `16%`, the system is saying: “I found a gap, but it is a low-novelty one, not a dramatic research opportunity.”

## 6. Overall Model Quality

This is a single number that combines coherence, coverage, and gap novelty.
The formula is:

```text
modelQuality = round(avgCoherence * 0.4 + topicCoverage * 0.3 + gapNovelty * 0.3, 2)
```

That means:
- topic coherence counts for 40%
- topic coverage counts for 30%
- gap novelty counts for 30%

### Example value
- `60%` means the model is okay.
Coverage is perfect, coherence is decent, but low gap novelty keeps the score from being higher.

### Feynman example
Imagine grading a school project on three parts:
- organization = 40%
- completeness = 30%
- creativity = 30%

If organization is okay, completeness is perfect, but creativity is weak, then the combined grade is around `60%`.
That is exactly what this number says about the analysis.

## 7. Coherence by Topic

This chart shows each topic's individual coherence score.
The app takes the topic names and the `coherence` values from the backend.

### Example values
- `segmentation / annotated / challenge` → `72%`
- `residual / imagenet / networks` → `100%`
- `fine-tuned / language / unsupervised` → `51%`
- `language / federated / dialog` → `38%`
- `knowledge / representation / cbr-kbqa` → `59%`

### What it means
Each line is a separate topic.
A topic at `100%` is very clean and focused.
A topic at `38%` is messy or mixed.

### Feynman example
If each topic is a basket of apples:
- `100%` means every apple in that basket tastes the same.
- `38%` means the basket contains apples and oranges.

So the system is telling you which topics are tight clusters and which ones may need better separation.

## 8. Gap Score Distribution

The section also shows how the gap scores are spread across buckets:
- `0.0–0.2`
- `0.2–0.4`
- `0.4–0.6`
- `0.6–0.8`
- `0.8–1.0`

Each bucket counts how many gaps fall into that range.

### Example distribution
- `1` gap in `0.0–0.2`
- `0` gaps in every higher bucket

That means the only gap found is very weak.

### Feynman example
Imagine measuring how big each crack is in a wall.
- Most cracks are tiny if they are in `0.0–0.2`.
- A strong, actionable crack would be in `0.6–1.0`.

The app says: if most gaps were in `0.6–1.0`, these would be strong research opportunities.
But this example has the gap in the weakest bucket.

## 9. What you should take away

In plain language:
- the system processed all 22 papers, so the dataset is complete.
- it found 5 topic groups, which is a reasonable number.
- topic coverage is perfect, so no paper was left out.
- topic coherence is moderate, so some topics are good while others need improvement.
- gap novelty is low, meaning the discovered gap is not a very exciting research opportunity.
- model quality is okay, driven down by the weak novelty even though coverage is perfect.

## 10. Why this is useful

This section helps you decide whether the analysis is worth trusting.
- if coherence is low, the topics may need better clustering,
- if coverage is low, some papers are being ignored,
- if gap novelty is low, the system is not finding new ideas,
- if model quality is low, the overall result is still weak.

So Section 7 is not just decoration. It is a diagnostic panel that tells you whether the pipeline worked well or whether the analysis needs improvement.

---

### File location
Saved as `research-evaluation-explanation.md` in the project root.
