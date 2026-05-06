# Section 5 — Research Map Visualization Explained

This document explains Section 5 of ResearchLens: the Research Map.
It uses the actual code and data format from the project, and it explains the map in plain language with examples.

## 1. What is the Research Map?

The Research Map is a 2D picture of your papers.
It is not a geographic map.
Instead, it places each paper as a dot in space so that:
- nearby dots are more similar papers,
- dots with the same color belong to the same topic,
- large circles show where each topic cluster lives,
- and lines show research gaps between topics.

In Feynman terms: the map is a way to see the shape of the research field.
If you were looking at a galaxy of papers, the map shows where the stars group and where the empty space is.

## 2. What data does it use?

Section 5 uses three things from the backend result:

1. `module2.topics` — the detected topics and the IDs of papers in each topic.
2. `module3.gaps` — the gap pairs between topics.
3. `module5.map.points` — the map coordinates for every paper.

The frontend adapts this into:
- `MapPoint` objects for each paper,
- `AdaptedGap` objects for each topic gap,
- topic centroids computed from all paper points.

## 3. How are paper positions created?

The backend code in `backend/src/services/module5Visualization.js` builds the map points.
It does not perform real UMAP or t-SNE.
It uses a deterministic grid plus noise to create a stable layout.

### The algorithm

For each paper:
- find the paper's topic,
- assign that paper to a topic grid cell,
- add a small random offset so dots do not sit exactly on top of each other.

The position calculation is in `paperToPoint()`.
Example:
- topic 0 gets center at `(-4, -2)`
- topic 1 gets center at `(0, -2)`
- topic 2 gets center at `(4, -2)`
- topic 3 gets center at `(-4, 2)`
- and so on.

Then each paper gets a little jitter:
- `noiseX` and `noiseY` are derived from the paper ID,
- the jitter is scaled by `1.8`,
- final point is `center + noise`.

So the backend creates a map like this:

```text
paper1: topic A → x = -4 + 0.3, y = -2 + 0.1
paper2: topic A → x = -4 - 0.4, y = -2 + 0.6
paper3: topic B → x = 0 + 0.2, y = -2 - 0.1
```

That means topic A papers cluster near one location and topic B papers cluster somewhere else.

## 4. What are topic centers?

Topic centers are the average location of all papers in that topic.
The backend also computes them, but the frontend recomputes them from live `allMapPoints`.

In code, the centroid for topic `T` is:

```text
centroid.x = average(x of all papers in topic T)
centroid.y = average(y of all papers in topic T)
```

So if topic A has three papers at `(-3.9, -1.8)`, `(-4.4, -1.2)`, and `(-3.5, -1.9)`, the centroid will be near `(-3.93, -1.63)`.

The frontend renders centroids as larger rings when `showCentroids` is enabled.
This is the “topic center of gravity.”

## 5. What are the gap lines?

Gap lines come from `module3.gaps`.
Each gap object has:
- `topicA`, `topicB` — the two topic IDs,
- `gapScore` — how strong the gap is,
- `severity` — `critical`, `moderate`, or `low`.

The frontend filters these by `filterGapScore` and then draws lines between the two topic centroids.
That means:
- the line connects the center of Topic A and Topic B,
- the line is only shown if the gap score is high enough,
- the line represents a potential research opportunity.

Example:
- Topic A is “medical segmentation”
- Topic B is “self-supervised learning”
- If there are few papers combining them,
- the map draws a gap line between their centers.

This is the core idea: the map shows not just where topics are, but where gaps are.

## 6. What the frontend draws

The map is rendered inside `frontend/src/pages/dashboard/sections/MapSection.tsx`.
It has two modes:
- `cluster` mode: show the dot map and gap lines,
- `citation` mode: show a citation graph view.

### Cluster mode

In cluster mode, the main visual elements are:
- paper dots (`paperPositions`),
- topic centroids (`centroids`),
- gap lines (`filteredGaps`).

Each paper dot uses:
- `cx`, `cy` = transformed coordinates from the backend x/y values,
- `color` = topic color,
- `title` and `year` for hover details.

If you hover a paper dot, the UI shows a tooltip with the paper title and year.
If you click it, the paper becomes selected.

The map also supports:
- toggling centroids on/off,
- toggling gap connections on/off,
- filtering gaps by minimum gap score,
- hiding entire topics by clicking on topic controls.

### Citation mode

The citation mode is mostly a placeholder in this version.
It prepares for citation arrows, but the live backend-only mode does not provide actual citation edges.
Instead, the UI can still export a DOT or JSON graph for future citation integration.

## 7. What do the summary cards mean?

At the top of Section 5, the cards show:
- `Papers` — number of map points,
- `Topics` — number of topic clusters,
- `Gaps` — number of detected gap pairs,
- `Citations` — number of citation edges currently known.

The `Citations` count is usually zero in live mode because the project does not supply citation data from the backend.

## 8. Example in plain language

Imagine a dataset with 12 papers and 4 topics.
The backend places them like this:
- Topic 1 papers around `(-4, -2)`
- Topic 2 papers around `(0, -2)`
- Topic 3 papers around `(4, -2)`
- Topic 4 papers around `(-4, 2)`

Now suppose there is a gap between Topic 2 and Topic 4.
The map draws a line between the center of Topic 2 and the center of Topic 4.
That line says: “these two groups are related, but nobody has written many papers connecting them.”

If you hide Topic 4, those dots disappear and the line disappears with them.
If you turn off centroids, the large rings around topic clusters disappear, but the colored dots remain.

## 9. Why this section can be confusing

There are two main sources of confusion:

1. The map is not a real spatial map.
   - It is a synthetic projection: position is invented to make topics separate.
   - It is not latitude/longitude. It is a similarity layout.

2. The citation view is not a full citation network yet.
   - The code supports exporting a citation graph,
   - but it does not currently receive citation edges from the backend in live mode.

So the Research Map is best read as:
- a topic cluster diagram,
- enhanced with gap lines,
- and not a true 2D embedding like UMAP.

## 10. How to explain it to someone else

If you want to explain this section in simple terms, say:

- “Each dot is a paper.”
- “Same-colored dots belong to the same research topic.”
- “Dots that are close together are more similar.”
- “Big glowing circles show the center of each topic cluster.”
- “Lines between topic centers show possible unexplored linkages.”

That is the heart of Section 5.

## 11. File location

This explanation is saved in `research-map-explanation.md` in the project root.
