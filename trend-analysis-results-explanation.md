# Trend Analysis Results Explanation for ResearchLens

This document explains the trend summary output shown in the dashboard, including:
- `Trend Analysis Results`
- `Rising Topics`
- `Stable Topics`
- `Fastest Growing`

## 1. What this summary means

The Trend Analysis Results section summarizes what Module 4 produced for the current dataset.
It shows how many detected topics are classified as rising or stable, and identifies the topic with the strongest growth.

### Example output

- `1 Rising Topics`
- `4 Stable Topics`
- `segmentation / annotated / challenge`
- `Fastest Growing`

The line `segmentation / annotated / challenge` represents a topic label or topic keywords that describe the strongest-growing topic.

## 2. How the counts are computed

The frontend calculates these summary values from `backendResult.modules.module4.trends`.
Each trend object has a `trend` label:
- `rising`
- `stable`
- `declining`

The summary counts are:

```text
Rising Topics = number of trends where trend === 'rising'
Stable Topics = number of trends where trend === 'stable'
```

So `1 Rising Topics` means exactly one topic was classified as rising.
`4 Stable Topics` means exactly four topics were classified as stable.

## 3. How "Fastest Growing" is chosen

The dashboard selects the fastest-growing topic by comparing a simplified growth rate across all topics.

For each topic, it computes:

```text
growthRate = (maxCount - minCount) / maxCount
```

Where:
- `maxCount` is the highest yearly paper count for that topic
- `minCount` is the lowest yearly paper count for that topic

Then it picks the topic with the highest `growthRate` value.
That topic is shown as the `Fastest Growing` topic.

## 4. How trend labels are assigned

Trend labels come from Module 4 in the backend.
The backend computes a linear regression slope from yearly paper counts for each topic.

The thresholds are:
- `slope > 0.08` → `rising`
- `slope < -0.08` → `declining`
- otherwise → `stable`

So a topic is rising when its year-over-year publication count has a sufficiently positive slope.
Stable topics are those with a flatter publication trajectory.

## 5. What the topic label means

The topic label displayed under `Fastest Growing` is derived from the trend topic name.
In the example, `segmentation / annotated / challenge` is the topic name or summary label for the topic that had the highest growth rate.

## 6. Why this matters

- `Rising Topics` highlights current areas gaining momentum.
- `Stable Topics` shows areas with consistent publication output.
- `Fastest Growing` points to the topic with the strongest recent evidence of growth.

This summary helps users quickly identify which research directions are emerging and which are steady.

---

### File saved
This explanation is saved in `trend-analysis-results-explanation.md` in the project root.
