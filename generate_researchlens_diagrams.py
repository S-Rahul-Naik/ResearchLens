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
import textwrap
from pathlib import Path
from typing import Iterable, Sequence

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import patheffects as pe
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle


OUTPUT_DIR = Path(__file__).resolve().parent / "generated_diagrams"
REPORT_PATH = OUTPUT_DIR / "researchlens_diagram_report.png"

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

GRADIENTS = {
    "teal": ("#ecfeff", "#ccfbf1", TEAL),
    "blue": ("#eff6ff", "#dbeafe", BLUE),
    "purple": ("#f5f3ff", "#ede9fe", PURPLE),
    "amber": ("#fffbeb", "#fef3c7", AMBER),
    "rose": ("#fff1f2", "#ffe4e6", ROSE),
    "green": ("#f0fdf4", "#dcfce7", GREEN),
    "orange": ("#fff7ed", "#ffedd5", ORANGE),
    "slate": ("#f8fafc", "#e2e8f0", SLATE),
}


def make_canvas(title: str, subtitle: str | None = None, *, landscape: bool = True):
    # A4 sizes in inches
    figsize = (11.69, 8.27) if landscape else (8.27, 11.69)
    fig, ax = plt.subplots(figsize=figsize, dpi=220)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    add_background(ax)
    ax.text(0.03, 0.97, title, fontsize=20, fontweight="bold", color=TEXT, va="top")
    if subtitle:
        ax.text(0.03, 0.93, subtitle, fontsize=10, color=MUTED, va="top")
    return fig, ax


def add_background(ax):
    gradient = np.linspace(0, 1, 512)
    gradient = np.vstack([gradient, gradient])
    cmap = LinearSegmentedColormap.from_list("rl_bg", ["#f8fafc", "#eef2ff", "#ecfeff", "#ffffff"])
    ax.imshow(gradient, extent=[0, 1, 0, 1], origin="lower", aspect="auto", cmap=cmap, alpha=0.6, zorder=0)

    for (x, y), size, color, alpha in [
        ((0.06, 0.90), 0.17, "#ccfbf1", 0.26),
        ((0.92, 0.88), 0.15, "#dbeafe", 0.24),
        ((0.90, 0.10), 0.18, "#fae8ff", 0.18),
    ]:
        ax.add_patch(Circle((x, y), size, facecolor=color, edgecolor="none", alpha=alpha, zorder=0.1))


def add_box(ax, x: float, y: float, w: float, h: float, text: str, *, fc=CARD, ec=BORDER, color=TEXT,
            fontsize: int = 10, weight: str = "normal", radius: float = 0.02, align: str = "center", shadow: bool = True):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.012,rounding_size={radius}",
        linewidth=1.2,
        facecolor=fc,
        edgecolor=ec,
        zorder=2,
    )
    if shadow:
        patch.set_path_effects([
            pe.withSimplePatchShadow(offset=(0.02, -0.02), alpha=0.12, shadow_rgbFace="#94a3b8"),
            pe.Normal(),
        ])
    ax.add_patch(patch)
    ha = "center" if align == "center" else "left"
    tx = x + w / 2 if align == "center" else x + 0.02
    wrapped = wrap_text_for_box(text, w, fontsize)
    ax.text(tx, y + h / 2, wrapped, ha=ha, va="center", fontsize=fontsize, color=color, fontweight=weight, zorder=3)
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
        zorder=4,
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


def gradient_card(ax, x: float, y: float, w: float, h: float, title: str, desc: str, accent: str, palette: tuple[str, str, str]):
    top, mid, edge = palette
    add_box(ax, x, y, w, h, "", fc=top, ec=edge, shadow=True)
    if h < 0.1:
        # Compact node mode for tiny boxes to avoid text overlap.
        label = wrap_text_for_box(title, w, 9)
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center", fontsize=8.8, fontweight="bold", color=TEXT, zorder=3)
        return

    header_h = min(0.035, h * 0.28)
    ax.add_patch(FancyBboxPatch((x, y + h - header_h), w, header_h, boxstyle="round,pad=0.01,rounding_size=0.02",
                                linewidth=0, facecolor=mid, alpha=0.96, zorder=2.1))
    ax.text(x + 0.02, y + h - (header_h + 0.012), wrap_text_for_box(title, w - 0.04, 10), ha="left", va="top", fontsize=9.8, fontweight="bold", color=TEXT, zorder=3)
    if desc:
        wrapped_desc = wrap_text_for_box(desc, w - 0.04, 9)
        max_lines = 3 if h >= 0.18 else 2
        desc_lines = wrapped_desc.splitlines()
        if len(desc_lines) > max_lines:
            trimmed = desc_lines[:max_lines]
            trimmed[-1] = trimmed[-1].rstrip(" .") + "..."
            wrapped_desc = "\n".join(trimmed)
        ax.text(x + 0.02, y + h - (header_h + 0.05), wrapped_desc, ha="left", va="top", fontsize=8.5, color=MUTED, zorder=3)


def wrap_text_for_box(text: str, width: float, font_size: int) -> str:
    if not text:
        return ""
    if "\n" in text:
        return "\n".join(wrap_text_for_box(part, width, font_size) for part in text.split("\n"))
    # Approximate character budget from box width in axis units.
    chars = max(12, int(width * 95))
    return textwrap.fill(text, width=chars, break_long_words=False, break_on_hyphens=False)


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

    gradient_card(ax, *user, "Researcher Browser", "Start analyses", "", GRADIENTS["teal"])
    gradient_card(ax, *web, "React + Vite UI", "Dashboard, results, export", "", GRADIENTS["blue"])
    gradient_card(ax, *api, "Express Backend", "Auth, uploads, orchestration", "", GRADIENTS["green"])
    gradient_card(ax, *db, "MongoDB", "Reports + corpus", "", GRADIENTS["amber"])
    gradient_card(ax, *n8n, "n8n Workflow", "Workflow orchestration", "", GRADIENTS["purple"])
    gradient_card(ax, *modules, "Analysis Modules", "Topics, gaps, trends, map", "", GRADIENTS["orange"])
    gradient_card(ax, *python, "Python Services", "Topic/gap/trend helpers", "", GRADIENTS["slate"])
    gradient_card(ax, *llm, "LLM Layer", "Ollama, Gemini, OpenAI", "", GRADIENTS["rose"])

    connect_boxes(ax, user, web, color=TEAL)
    connect_boxes(ax, web, api, color=BLUE)
    connect_boxes(ax, api, db, color=GREEN)
    add_arrow(ax, (0.64, 0.70), (0.62, 0.58), color=PURPLE, rad=-0.18)
    add_arrow(ax, (0.64, 0.70), (0.64, 0.58), color=ORANGE)
    add_arrow(ax, (0.64, 0.58), (0.42, 0.58), color=ORANGE)
    add_arrow(ax, (0.28, 0.43), (0.23, 0.43), color=SLATE)
    connect_boxes(ax, n8n, llm, color=ROSE)
    add_arrow(ax, (0.64, 0.70), (0.88, 0.72), color=AMBER, rad=0.0)

    ax.text(0.05, 0.30, "Stored outputs: analysis runs, report markdown, paper subsets, and history", fontsize=10, color=MUTED)

    save(fig, "system_architecture")


def generate_data_flow():
    fig, ax = make_canvas(
        "ResearchLens Data Flow Diagram",
        "Selected papers flow from uploads to processing, results, history, and downloads",
    )

    steps = [
        ("Upload PDFs / JSON", "corpus ingestion", 0.06, 0.70, TEAL),
        ("Select papers", "run subset", 0.37, 0.70, BLUE),
        ("Run analysis", "selection validated", 0.68, 0.70, PURPLE),
        ("n8n / local modules", "topics, gaps, trends", 0.20, 0.42, ORANGE),
        ("Analysis report", "MongoDB + history", 0.56, 0.42, GREEN),
        ("Overview / Results", "latest run", 0.37, 0.20, AMBER),
    ]

    boxes = {}
    for title, desc, x, y, color in steps:
        boxes[title] = (x, y, 0.24, 0.12)
        palette = GRADIENTS["teal"] if color == TEAL else GRADIENTS["blue"] if color == BLUE else GRADIENTS["purple"] if color == PURPLE else GRADIENTS["orange"] if color == ORANGE else GRADIENTS["green"] if color == GREEN else GRADIENTS["amber"]
        gradient_card(ax, x, y, 0.24, 0.12, title, desc, "", palette)

    connect_boxes(ax, boxes["Upload PDFs / JSON"], boxes["Select papers"], color=SLATE)
    connect_boxes(ax, boxes["Select papers"], boxes["Run analysis"], color=SLATE)
    add_arrow(ax, (0.80, 0.70), (0.80, 0.56), color=ORANGE)
    add_arrow(ax, (0.80, 0.56), (0.32, 0.50), color=ORANGE)
    connect_boxes(ax, boxes["n8n / local modules"], boxes["Analysis report"], color=SLATE)
    add_arrow(ax, (0.68, 0.42), (0.49, 0.32), color=GREEN, rad=-0.1)
    add_arrow(ax, (0.32, 0.42), (0.49, 0.32), color=AMBER, rad=0.1)
    gradient_card(ax, 0.34, 0.05, 0.32, 0.11, "Latest run", "source for overview/results", "", GRADIENTS["amber"])
    add_arrow(ax, (0.50, 0.20), (0.50, 0.16), color=AMBER)

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
        ("7", "Evidence Linking", ROSE),
        ("8", "Report Synthesis", GREEN),
        ("9", "Result Packaging", SLATE),
        ("10", "Scientific Honesty", "#1d4ed8"),
    ]

    x0, y1, y2, w, h, gap = 0.08, 0.67, 0.52, 0.15, 0.10, 0.03
    boxes = []
    for idx, (num, label, color) in enumerate(names):
        row = 0 if idx < 5 else 1
        x = x0 + (idx % 5) * (w + gap)
        y = y1 if row == 0 else y2
        add_box(ax, x, y, w, h, f"{num}\n{label}", fc="#ffffff", ec=color, fontsize=10, weight="bold")
        boxes.append((x, y, w, h))
        if idx < 4:
            add_arrow(ax, (x + w, y + h / 2), (x + w + gap, y + h / 2), color=SLATE)
        if 5 <= idx < 9:
            add_arrow(ax, (x + w, y + h / 2), (x + w + gap, y + h / 2), color=SLATE)

    # Connector between row 1 and row 2
    add_arrow(ax, (0.89, y1 + h / 2), (0.89, y2 + h / 2), color=SLATE)

    ax.text(0.05, 0.40, "Input: selected papers + question", fontsize=12, color=TEXT, fontweight="bold")
    gradient_card(ax, 0.06, 0.12, 0.26, 0.20, "n8n master workflow", "Webhooks, retries, normalization", "automation", GRADIENTS["purple"])
    gradient_card(ax, 0.37, 0.12, 0.26, 0.20, "Backend formatter", "Save report and merge evidence", "storage", GRADIENTS["green"])
    gradient_card(ax, 0.68, 0.12, 0.26, 0.20, "Frontend views", "Overview, Results, History, Export", "ui", GRADIENTS["blue"])
    add_arrow(ax, (0.18, 0.40), (0.18, 0.32), color=PURPLE)
    add_arrow(ax, (0.50, 0.32), (0.50, 0.24), color=GREEN)
    add_arrow(ax, (0.81, 0.32), (0.81, 0.24), color=BLUE)

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
    gradient_card(ax, *boxes["Input"], "Paper text", "abstract + content", "", GRADIENTS["teal"])
    gradient_card(ax, *boxes["Preprocess"], "Clean & tokenize", "remove noise", "", GRADIENTS["blue"])
    gradient_card(ax, *boxes["Embed"], "Embeddings", "semantic vectors", "", GRADIENTS["rose"])
    gradient_card(ax, *boxes["Cluster"], "BERTopic / clustering", "group by theme", "", GRADIENTS["purple"])
    gradient_card(ax, *boxes["Label"], "LLM label", "human-readable topic", "", GRADIENTS["amber"])

    connect_boxes(ax, boxes["Input"], boxes["Preprocess"], color=BLUE)
    connect_boxes(ax, boxes["Preprocess"], boxes["Embed"], color=ROSE)
    connect_boxes(ax, boxes["Embed"], boxes["Cluster"], color=PURPLE)
    connect_boxes(ax, boxes["Cluster"], boxes["Label"], color=AMBER)

    gradient_card(ax, 0.08, 0.34, 0.24, 0.18, "Topic embeddings", "Reduce papers into semantic vectors", "", GRADIENTS["teal"])
    gradient_card(ax, 0.38, 0.34, 0.24, 0.18, "Topic clusters", "Group related papers by theme", "", GRADIENTS["purple"])
    gradient_card(ax, 0.68, 0.34, 0.24, 0.18, "Topic cards", "Name, keywords, coherence, paper counts", "", GRADIENTS["green"])
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
        palette = GRADIENTS["teal"] if color == TEAL else GRADIENTS["blue"] if color == BLUE else GRADIENTS["purple"] if color == PURPLE else GRADIENTS["orange"] if color == ORANGE else GRADIENTS["green"]
        gradient_card(ax, x, y, w, h, label, "", "", palette)
        boxes.append((x, y, w, h))
    for a, b in zip(boxes, boxes[1:]):
        connect_boxes(ax, a, b, color=SLATE)

    gradient_card(ax, 0.08, 0.36, 0.36, 0.18, "Keyword ranking", "Rank high-signal words from title, abstract, and content", "", GRADIENTS["blue"])
    gradient_card(ax, 0.54, 0.36, 0.38, 0.18, "ResearchLens output", "Keywords enrich summaries, topics, and search filters", "", GRADIENTS["green"])
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
        palette = GRADIENTS["teal"] if color == TEAL else GRADIENTS["blue"] if color == BLUE else GRADIENTS["purple"] if color == PURPLE else GRADIENTS["orange"] if color == ORANGE else GRADIENTS["rose"]
        gradient_card(ax, x, y, w, h, title, "", "", palette)
    for a, b in zip(list(nodes.values()), list(nodes.values())[1:]):
        connect_boxes(ax, a, b, color=SLATE)

    gradient_card(ax, 0.06, 0.32, 0.28, 0.20, "Evidence sources", "Backend papers, topics, gaps, trends", "", GRADIENTS["purple"])
    gradient_card(ax, 0.37, 0.32, 0.28, 0.20, "RAG context", "Relevant snippets are assembled before generation", "", GRADIENTS["orange"])
    gradient_card(ax, 0.68, 0.32, 0.26, 0.20, "Answer", "Concise response with links to evidence", "", GRADIENTS["green"])
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
        circ = Circle((cx, cy), 0.12, facecolor=color, alpha=0.07, edgecolor=color, linewidth=2)
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
        add_box(ax, x - 0.075, y - 0.03, 0.15, 0.06, label, fc="#ffffff", ec=color, fontsize=8.6, weight="bold")

    graph_nodes = [
        (0.18, 0.44, "paper 1", TEAL),
        (0.38, 0.44, "paper 2", BLUE),
        (0.58, 0.44, "paper 3", PURPLE),
        (0.78, 0.44, "paper 4", ORANGE),
    ]
    for x, y, label, color in graph_nodes:
        add_box(ax, x - 0.07, y - 0.03, 0.14, 0.06, label, fc="#f8fafc", ec=color, fontsize=9, weight="bold")

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


def generate_report_gallery(image_paths: Sequence[Path]):
    cols = 2
    rows = math.ceil(len(image_paths) / cols)
    fig, axes = plt.subplots(rows, cols, figsize=(16, rows * 4.5), dpi=180)
    fig.patch.set_facecolor(BG)
    axes = np.array(axes).reshape(rows, cols)

    fig.suptitle("ResearchLens Diagram Report", fontsize=22, fontweight="bold", color=TEXT, y=0.995)
    fig.text(0.5, 0.972, "All generated diagrams in one place for quick review and report embedding", ha="center", va="top", fontsize=10, color=MUTED)

    for idx, ax in enumerate(axes.flat):
        ax.set_facecolor("#ffffff")
        ax.axis("off")
        if idx >= len(image_paths):
            ax.set_visible(False)
            continue
        img = plt.imread(image_paths[idx])
        ax.imshow(img)
        ax.set_title(image_paths[idx].stem.replace("_", " ").title(), fontsize=11, color=TEXT, pad=10)

    fig.tight_layout(rect=[0, 0, 1, 0.965])
    fig.savefig(REPORT_PATH, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved {REPORT_PATH}")


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
    image_paths = sorted([p for p in OUTPUT_DIR.glob("*.png") if p.name != REPORT_PATH.name])
    generate_report_gallery(image_paths)
    print(f"\nDone. Images written to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
