# Trend Analysis Explanation for ResearchLens

This document explains how ResearchLens detects topics and determines whether each topic is rising, declining, or stable.

## 1. What input does the system use?

The system starts from the uploaded papers. Each paper is represented with at least:
- `id` — unique paper identifier
- `title`
- `year` — publication year
- `abstract`
- `content` or full text

These papers are the raw input for the analysis pipeline.

## 2. How are topics detected?

Topic detection is performed in Module 2 of the backend pipeline.

### Inputs for topic detection
- `papers`: the full list of uploaded papers
- A semantic model that converts paper text into embeddings

### What the module does
- It groups papers into coherent research topics using semantic similarity.
- Each topic contains:
  - `topicId` — a unique topic identifier
  - `name` — the topic label
  - `keywords` — core keywords for that topic
  - `paperIds` — the list of paper IDs assigned to that topic

So the detected topics are not hardcoded. They come from the actual papers and the relationships between them.

## 3. How is trend status determined?

Trend detection happens in Module 4.

### Inputs for trend detection
- `papers`: the same paper list used for topic detection
- `topics`: the topic assignments created by Module 2

### What the module computes
For each topic:
1. Collect all papers assigned to that topic.
2. Count how many of those papers were published each year.
3. Build a `yearlyCounts` series such as:
   - `[{ year: 2019, count: 2 }, { year: 2020, count: 5 }, ...]`
4. Compute a linear trend slope across year vs count.

The exact code uses a simple linear regression formula:
- `x` = year
- `y` = number of papers in that year

The slope is calculated using:
- `slope = (n * sum(x*y) - sum(x) * sum(y)) / (n * sum(x^2) - sum(x)^2)`

### Trend label thresholds
The trend label is assigned from the slope value:
- `slope > 0.08` → `rising`
- `slope < -0.08` → `declining`
- otherwise → `stable`

That means:
- A positive upward slope stronger than `0.08` indicates a rising topic.
- A negative slope lower than `-0.08` indicates a declining topic.
- Small or flat slope values are treated as stable.

## 4. Why does the app say `5 Topics Detected` and `1 rising`?

That means:
- Module 2 produced 5 distinct topic groups from the uploaded papers.
- Module 4 analyzed the publication counts for those topics.
- Only one topic had a slope large enough to cross the rising threshold.
- The remaining topics were either stable or declining based on their year-over-year publication trend.

## 5. How the final trend object looks

Each topic trend result contains:
- `topicId`
- `topicName`
- `yearlyCounts` — paper counts per year
- `slope` — the computed growth slope
- `trend` — one of `rising`, `declining`, or `stable`

## 6. Summary

ResearchLens finds topics by grouping similar papers into topics.
Then it decides rising/stable/declining by tracking how many papers appear per topic each year and computing a linear slope over time.
The final label is based on whether that slope is strongly positive, strongly negative, or close to flat.

---

### File generated
This explanation is saved in `trend-analysis-explanation.md` in the project root.
