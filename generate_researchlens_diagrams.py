"""Generate ResearchLens diagram images.

This script creates PNG files for the key project diagrams shown in the UI:
- System architecture
- Data flow
- Workflow orchestration pipeline
- Topic modeling workflow
- Keyword extraction workflow
- Chatbot workflow
- Topic cluster visualization
- Keyword extraction analysis graph

Dependencies:
    pip install matplotlib

Run:
    python generate_researchlens_diagrams.py

Output:
    ./generated_diagrams/*.png
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable, Sequence

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle


OUTPUT_DIR = Path(__file__).resolve().parent / "generated_diagrams"

BG = "#f8fafc"
CARD = "#ffffff"
TEXT = "#0f172a"
MUTED = "#475569"
TEAL = "#14b8a6"
AMBER = "#f59e0b"
ROSE = "#ef4444"
BLUE = "#3b82f6"
PURPLE = "#8b5cf6"
GREEN = "#22c55e"
ORANGE = "#f97316"
CYAN = "#06b6d4"
SLATE = "#64748b"
BORDER = "#dbeafe"


def make_canvas(title: str, subtitle: str | None = None):
    fig, ax = plt.subplots(figsize=(14, 9), dpi=180)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    ax.text(0.03, 0.97, title, fontsize=20, fontweight="bold", color=TEXT, va="top")
    if subtitle:
        ax.text(0.03, 0.93, subtitle, fontsize=10, color=MUTED, va="top")
    return fig, ax


def add_box(ax, x: float, y: float, w: float, h: float, text: str, *, fc=CARD, ec=BORDER, color=TEXT,
            fontsize: int = 10, weight: str = "normal", radius: float = 0.02, align: str = "center"):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.012,rounding_size={radius}",
        linewidth=1.2,
        facecolor=fc,
        edgecolor=ec,
    )
    ax.add_patch(patch)
    ha = "center" if align == "center" else "left"
    tx = x + w / 2 if align == "center" else x + 0.02
    ax.text(tx, y + h / 2, text, ha=ha, va="center", fontsize=fontsize, color=color, fontweight=weight, wrap=True)
    return patch


def add_arrow(ax, p1: tuple[float, float], p2: tuple[float, float], *, color=SLATE, rad: float = 0.0,
              style: str = "-|>", lw: float = 1.8, alpha: float = 0.9):
    arrow = FancyArrowPatch(
        p1, p2,
        arrowstyle=style,
        mutation_scale=14,
        linewidth=lw,
        color=color,
        connectionstyle=f"arc3,rad={rad}",
        alpha=alpha,
    )
    ax.add_patch(arrow)
    return arrow


def center(box: tuple[float, float, float, float]):
    x, y, w, h = box
    return (x + w / 2, y + h / 2)


def connect_boxes(ax, a: tuple[float, float, float, float], b: tuple[float, float, float, float], *, color=SLATE, rad=0.0):
    ax1, ay1, aw, ah = a
    bx, by, bw, bh = b
    p1 = (ax1 + aw, ay1 + ah / 2)
    p2 = (bx, by + bh / 2)
    add_arrow(ax, p1, p2, color=color, rad=rad)


def labeled_step(ax, x: float, y: float, w: float, h: float, title: str, desc: str, *, fill: str, edge: str):
    add_box(ax, x, y, w, h, "", fc=fill, ec=edge)
    ax.text(x + 0.02, y + h - 0.03, title, ha="left", va="top", fontsize=12, fontweight="bold", color=TEXT)
    ax.text(x + 0.02, y + h - 0.08, desc, ha="left", va="top", fontsize=9, color=MUTED, wrap=True)


def generate_system_architecture():
    fig, ax = make_canvas(
        "ResearchLens System Architecture",
        "Frontend dashboard, backend API, analysis modules, n8n orchestration, and persistence layer",
    )

    user = (0.05, 0.74, 0.18, 0.12)
    web = (0.30, 0.72, 0.20, 0.14)
    api = (0.55, 0.70, 0.18, 0.18)
    db = (0.82, 0.72, 0.12, 0.14)
    n8n = (0.55, 0.42, 0.18, 0.16)
    modules = (0.30, 0.38, 0.20, 0.20)
    python = (0.05, 0.40, 0.18, 0.16)
    llm = (0.82, 0.40, 0.12, 0.16)

    add_box(ax, *user, "Researcher\nBrowser", fc="#ecfeff", ec=CYAN, fontsize=12, weight="bold")
    add_box(ax, *web, "React + Vite UI\nDashboard / Results / Export", fc="#eff6ff", ec=BLUE, fontsize=11, weight="bold")
    add_box(ax, *api, "Express Backend\nAuth, uploads, analysis API", fc="#f0fdf4", ec=GREEN, fontsize=11, weight="bold")
    add_box(ax, *db, "MongoDB\nAnalysis reports + corpus", fc="#fefce8", ec=AMBER, fontsize=11, weight="bold")
    add_box(ax, *n8n, "n8n Workflow\nOrchestration engine", fc="#faf5ff", ec=PURPLE, fontsize=11, weight="bold")
    add_box(ax, *modules, "Analysis Modules\nSummaries, topics, gaps, trends, map", fc="#fff7ed", ec=ORANGE, fontsize=10, weight="bold")
    add_box(ax, *python, "Python services\nTopic / gap / trend helpers", fc="#f8fafc", ec=SLATE, fontsize=10, weight="bold")
    add_box(ax, *llm, "LLM layer\nOllama / Gemini / OpenAI", fc="#fdf2f8", ec=ROSE, fontsize=10, weight="bold")

    connect_boxes(ax, user, web, color=TEAL)
    connect_boxes(ax, web, api, color=BLUE)
    connect_boxes(ax, api, db, color=GREEN)
    connect_boxes(ax, api, n8n, color=PURPLE, rad=-0.2)
    connect_boxes(ax, api, modules, color=ORANGE, rad=0.18)
    connect_boxes(ax, modules, python, color=SLATE)
    connect_boxes(ax, n8n, llm, color=ROSE)
    add_arrow(ax, (0.64, 0.70), (0.88, 0.72), color=AMBER, rad=0.0)

    ax.text(0.31, 0.61, "UI requests analysis, shows latest run, and renders exports", fontsize=10, color=MUTED)
    ax.text(0.56, 0.60, "Backend validates selection, routes to local or n8n pipeline", fontsize=10, color=MUTED)
    ax.text(0.05, 0.30, "Stored outputs: analysis runs, report markdown, paper subsets, and history", fontsize=10, color=MUTED)

    save(fig, "system_architecture")


def generate_data_flow():
    fig, ax = make_canvas(
        "ResearchLens Data Flow Diagram",
        "Selected papers flow from uploads to processing, results, history, and downloads",
    )

    steps = [
        ("Upload PDFs / JSON", "corpus ingestion", 0.05, 0.68, TEAL),
        ("Select papers", "user picks run subset", 0.25, 0.68, BLUE),
        ("Run analysis", "backend validates selection", 0.45, 0.68, PURPLE),
        ("n8n / local modules", "summaries, topics, gaps, trends", 0.66, 0.68, ORANGE),
        ("Analysis report", "MongoDB + run history", 0.82, 0.68, GREEN),
        ("Overview / Results", "latest run rendering", 0.45, 0.30, AMBER),
    ]

    boxes = {}
    for title, desc, x, y, color in steps:
        boxes[title] = (x, y, 0.16, 0.12)
        add_box(ax, x, y, 0.16, 0.12, f"{title}\n{desc}", fc="#ffffff", ec=color, fontsize=10, weight="bold")

    for left, right in [(steps[i][0], steps[i + 1][0]) for i in range(4)]:
        connect_boxes(ax, boxes[left], boxes[right], color=SLATE)
    add_arrow(ax, (0.53, 0.68), (0.53, 0.42), color=AMBER)
    add_arrow(ax, (0.74, 0.68), (0.53, 0.42), color=GREEN, rad=-0.1)
    add_arrow(ax, (0.90, 0.68), (0.53, 0.42), color=PURPLE, rad=-0.15)

    ax.text(0.07, 0.54, "Important rule: dataset count ≠ processed run count", fontsize=12, fontweight="bold", color=TEXT)
    ax.text(0.07, 0.49, "All downstream views should read from the latest run object, not from the raw corpus.", fontsize=10, color=MUTED)

    save(fig, "data_flow")


def generate_workflow_orchestration():
    fig, ax = make_canvas(
        "Workflow Orchestration Pipeline",
        "Modules execute in a fixed order and each stage enriches the analysis context",
    )

    names = [
        ("1", "Summarization", TEAL),
        ("2", "Topic Modeling", BLUE),
        ("3", "Gap Detection", PURPLE),
        ("4", "Trend Detection", ORANGE),
        ("5", "Visualization", CYAN),
        ("6", "Chatbot", AMBER),
        ("7", "Contradictions", ROSE),
        ("8", "Method Matrix", GREEN),
        ("9", "Related Work", SLATE),
        ("10", "Scientific Honesty", "#1d4ed8"),
    ]

    x0, y, w, h, gap = 0.04, 0.62, 0.085, 0.14, 0.012
    boxes = []
    for idx, (num, label, color) in enumerate(names):
        x = x0 + idx * (w + gap)
        add_box(ax, x, y, w, h, f"{num}\n{label}", fc="#ffffff", ec=color, fontsize=9, weight="bold")
        boxes.append((x, y, w, h))
        if idx < len(names) - 1:
            add_arrow(ax, (x + w, y + h / 2), (x + w + gap, y + h / 2), color=SLATE)

    ax.text(0.05, 0.44, "Input: selected papers + question", fontsize=12, color=TEXT, fontweight="bold")
    labeled_step(ax, 0.05, 0.18, 0.26, 0.18, "n8n master workflow", "Webhooks, retries, and result normalization", fill="#faf5ff", edge=PURPLE)
    labeled_step(ax, 0.37, 0.18, 0.26, 0.18, "Backend formatter", "Saves report, merges evidence, updates history", fill="#f0fdf4", edge=GREEN)
    labeled_step(ax, 0.69, 0.18, 0.26, 0.18, "Frontend views", "Overview, Results, History, Export", fill="#eff6ff", edge=BLUE)
    add_arrow(ax, (0.18, 0.44), (0.18, 0.36), color=PURPLE)
    add_arrow(ax, (0.50, 0.36), (0.50, 0.30), color=GREEN)
    add_arrow(ax, (0.82, 0.36), (0.82, 0.30), color=BLUE)

    save(fig, "workflow_orchestration")


def generate_topic_modeling_workflow():
    fig, ax = make_canvas(
        "Topic Modeling Workflow Diagram",
        "Text is cleaned, embedded, clustered, labeled, and rendered as topic cards",
    )

    boxes = {
        "Input": (0.06, 0.72, 0.16, 0.12),
        "Preprocess": (0.25, 0.72, 0.16, 0.12),
        "Embed": (0.44, 0.72, 0.16, 0.12),
        "Cluster": (0.63, 0.72, 0.16, 0.12),
        "Label": (0.82, 0.72, 0.12, 0.12),
    }
    add_box(ax, *boxes["Input"], "Paper text\nabstract + content", fc="#ecfeff", ec=CYAN, fontsize=10, weight="bold")
    add_box(ax, *boxes["Preprocess"], "Clean & tokenize", fc="#eff6ff", ec=BLUE, fontsize=10, weight="bold")
    add_box(ax, *boxes["Embed"], "Embeddings", fc="#fdf2f8", ec=ROSE, fontsize=10, weight="bold")
    add_box(ax, *boxes["Cluster"], "BERTopic / clustering", fc="#faf5ff", ec=PURPLE, fontsize=10, weight="bold")
    add_box(ax, *boxes["Label"], "LLM label", fc="#fefce8", ec=AMBER, fontsize=10, weight="bold")

    connect_boxes(ax, boxes["Input"], boxes["Preprocess"], color=BLUE)
    connect_boxes(ax, boxes["Preprocess"], boxes["Embed"], color=ROSE)
    connect_boxes(ax, boxes["Embed"], boxes["Cluster"], color=PURPLE)
    connect_boxes(ax, boxes["Cluster"], boxes["Label"], color=AMBER)

    labeled_step(ax, 0.08, 0.34, 0.24, 0.18, "Topic embeddings", "Reduce papers into semantic vectors", fill="#ffffff", edge=CYAN)
    labeled_step(ax, 0.38, 0.34, 0.24, 0.18, "Topic clusters", "Group related papers by theme", fill="#ffffff", edge=PURPLE)
    labeled_step(ax, 0.68, 0.34, 0.24, 0.18, "Topic cards", "Name, keywords, coherence, paper counts", fill="#ffffff", edge=GREEN)
    add_arrow(ax, (0.20, 0.34), (0.38, 0.34), color=SLATE)
    add_arrow(ax, (0.62, 0.43), (0.68, 0.43), color=SLATE)

    save(fig, "topic_modeling_workflow")


def generate_keyword_extraction_workflow():
    fig, ax = make_canvas(
        "Keyword Extraction Workflow Diagram",
        "Document text is cleaned and scored to produce representative keywords",
    )

    stages = [
        (0.05, 0.72, 0.16, 0.12, "PDF text", TEAL),
        (0.24, 0.72, 0.16, 0.12, "Clean text", BLUE),
        (0.43, 0.72, 0.16, 0.12, "Tokenize", PURPLE),
        (0.62, 0.72, 0.16, 0.12, "Score terms", ORANGE),
        (0.81, 0.72, 0.14, 0.12, "Top keywords", GREEN),
    ]
    boxes = []
    for x, y, w, h, label, color in stages:
        add_box(ax, x, y, w, h, label, fc="#ffffff", ec=color, fontsize=10, weight="bold")
        boxes.append((x, y, w, h))
    for a, b in zip(boxes, boxes[1:]):
        connect_boxes(ax, a, b, color=SLATE)

    labeled_step(ax, 0.08, 0.36, 0.36, 0.18, "Keyword ranking", "Rank high-signal words from title, abstract, and content", fill="#f8fafc", edge=BLUE)
    labeled_step(ax, 0.54, 0.36, 0.38, 0.18, "ResearchLens output", "Keywords enrich summaries, topics, and search filters", fill="#f8fafc", edge=GREEN)
    add_arrow(ax, (0.44, 0.36), (0.54, 0.36), color=GREEN)

    ax.text(0.08, 0.16, "Typical scoring strategies: frequency, TF-IDF, noun phrases, and LLM-assisted refinement", fontsize=11, color=MUTED)

    save(fig, "keyword_extraction_workflow")


def generate_chatbot_workflow():
    fig, ax = make_canvas(
        "Chatbot Workflow Diagram",
        "Question answering combines retrieval from papers, gaps, topics, and citations",
    )

    nodes = {
        "User": (0.05, 0.72, 0.13, 0.12),
        "Query": (0.22, 0.72, 0.15, 0.12),
        "Retrieve": (0.41, 0.72, 0.16, 0.12),
        "Prompt": (0.61, 0.72, 0.15, 0.12),
        "LLM": (0.80, 0.72, 0.13, 0.12),
    }
    labels = [
        ("User", "Ask a question", TEAL),
        ("Query", "Normalize intent", BLUE),
        ("Retrieve", "Search papers / gaps", PURPLE),
        ("Prompt", "Build cited context", ORANGE),
        ("LLM", "Answer + citations", ROSE),
    ]
    for key, title, color in labels:
        x, y, w, h = nodes[key]
        add_box(ax, x, y, w, h, title, fc="#ffffff", ec=color, fontsize=10, weight="bold")
    for a, b in zip(list(nodes.values()), list(nodes.values())[1:]):
        connect_boxes(ax, a, b, color=SLATE)

    labeled_step(ax, 0.08, 0.34, 0.26, 0.18, "Evidence sources", "Backend papers, module 2 topics, module 3 gaps, module 4 trends", fill="#ffffff", edge=PURPLE)
    labeled_step(ax, 0.39, 0.34, 0.26, 0.18, "RAG context", "Relevant snippets are assembled before generation", fill="#ffffff", edge=ORANGE)
    labeled_step(ax, 0.70, 0.34, 0.22, 0.18, "Answer", "Concise response with links to evidence", fill="#ffffff", edge=GREEN)
    add_arrow(ax, (0.34, 0.34), (0.39, 0.34), color=ORANGE)
    add_arrow(ax, (0.65, 0.34), (0.70, 0.34), color=GREEN)

    save(fig, "chatbot_workflow")


def generate_topic_cluster_visualization():
    fig, ax = make_canvas(
        "Topic Cluster Visualization",
        "Stylized scatter plot for topic groups and research gaps",
    )

    centers = [
        (0.22, 0.68, TEAL, "LLM scaling"),
        (0.52, 0.68, PURPLE, "Federated learning"),
        (0.80, 0.68, ORANGE, "Computer vision"),
    ]
    for cx, cy, color, label in centers:
        circ = Circle((cx, cy), 0.11, facecolor=color, alpha=0.08, edgecolor=color, linewidth=2)
        ax.add_patch(circ)
        ax.text(cx, cy + 0.14, label, ha="center", va="bottom", fontsize=11, fontweight="bold", color=TEXT)

    points = []
    for i, (cx, cy, color, _) in enumerate(centers):
        for j in range(7):
            angle = (j / 7) * math.tau
            r = 0.03 + (j % 3) * 0.01
            x = cx + math.cos(angle) * r
            y = cy + math.sin(angle) * r * 0.8
            points.append((x, y, color))
            ax.scatter(x, y, s=36 + j * 3, c=color, alpha=0.9, edgecolors="white", linewidths=0.8)

    for gx, gy in [(0.34, 0.38), (0.60, 0.36), (0.70, 0.44)]:
        ax.scatter(gx, gy, s=60, c=ROSE, alpha=0.9, edgecolors="white", linewidths=1)
        ax.text(gx + 0.02, gy + 0.01, "gap", fontsize=9, color=ROSE, fontweight="bold")

    ax.text(0.06, 0.18, "Clusters represent topics; isolated points represent potential research gaps.", fontsize=11, color=MUTED)

    save(fig, "topic_cluster_visualization")


def generate_keyword_extraction_analysis_graph():
    fig, ax = make_canvas(
        "Keyword Extraction Analysis Graph",
        "Keyword signal across papers, topics, and gap detection",
    )

    keywords = [
        (0.10, 0.70, "foundation models", TEAL),
        (0.28, 0.78, "few-shot", BLUE),
        (0.46, 0.70, "alignment", PURPLE),
        (0.64, 0.78, "federated learning", ORANGE),
        (0.82, 0.70, "self-supervised", GREEN),
    ]
    for x, y, label, color in keywords:
        add_box(ax, x - 0.055, y - 0.028, 0.11, 0.056, label, fc="#ffffff", ec=color, fontsize=9, weight="bold")

    graph_nodes = [
        (0.18, 0.44, "paper 1", TEAL),
        (0.38, 0.44, "paper 2", BLUE),
        (0.58, 0.44, "paper 3", PURPLE),
        (0.78, 0.44, "paper 4", ORANGE),
    ]
    for x, y, label, color in graph_nodes:
        add_box(ax, x - 0.05, y - 0.03, 0.10, 0.06, label, fc="#f8fafc", ec=color, fontsize=9, weight="bold")

    # keyword-to-paper edges
    edges = [
        ((0.10, 0.70), (0.18, 0.47), TEAL),
        ((0.28, 0.78), (0.38, 0.47), BLUE),
        ((0.46, 0.70), (0.58, 0.47), PURPLE),
        ((0.64, 0.78), (0.78, 0.47), ORANGE),
        ((0.82, 0.70), (0.58, 0.47), GREEN),
    ]
    for p1, p2, color in edges:
        add_arrow(ax, p1, p2, color=color, rad=0.0, alpha=0.75)

    ax.text(0.08, 0.18, "Keywords with stronger cross-paper links are promoted into topics and gap explanations.", fontsize=11, color=MUTED)

    save(fig, "keyword_extraction_analysis_graph")


def save(fig, name: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{name}.png"
    fig.savefig(output_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved {output_path}")


def main():
    generate_system_architecture()
    generate_data_flow()
    generate_workflow_orchestration()
    generate_topic_modeling_workflow()
    generate_keyword_extraction_workflow()
    generate_chatbot_workflow()
    generate_topic_cluster_visualization()
    generate_keyword_extraction_analysis_graph()
    print(f"\nDone. Images written to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
