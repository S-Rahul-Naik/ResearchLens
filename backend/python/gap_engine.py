from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import spacy
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


EMBEDDING_MODEL = os.getenv('RESEARCHLENS_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')

GENERIC_TERMS = {
    'image', 'images', 'system', 'systems', 'computer', 'computers', 'network', 'networks',
    'model', 'models', 'method', 'methods', 'data', 'dataset', 'datasets', 'task', 'tasks',
    'approach', 'approaches', 'framework', 'frameworks', 'analysis', 'analyses', 'performance',
    'learning', 'research', 'study', 'studies', 'paper', 'papers', 'result', 'results',
    'baseline', 'baselines', 'algorithm', 'algorithms', 'technique', 'techniques', 'problem',
    'problems', 'feature', 'features', 'experiment', 'experiments', 'evaluation', 'evaluations',
    'training', 'train', 'trained', 'test', 'testing', 'vision',
    'deep learning', 'machine learning', 'artificial intelligence'
}

METHOD_PATTERNS = [
    r'\bTransformer(?:s)?\b',
    r'\bViT\b',
    r'\bCNN(?:s)?\b',
    r'\bResNet(?:s)?\b',
    r'\bBERT\b',
    r'\bGPT-?\d*\b',
    r'\bLSTM\b',
    r'\bRNN(?:s)?\b',
    r'\bGNN(?:s)?\b',
    r'\bU-?Net\b',
    r'\bDiffusion\b',
    r'\bCLIP\b',
    r'\bSwin\b',
    r'\bDeiT\b'
]

TASK_PATTERNS = [
    r'\bsegmentation\b',
    r'\bclassification\b',
    r'\bdetection\b',
    r'\bretrieval\b',
    r'\bgeneration\b',
    r'\bforecasting\b',
    r'\btranslation\b',
    r'\bregistration\b',
    r'\brecognition\b',
    r'\bsummarization\b',
    r'\blocalization\b',
    r'\breconstruction\b',
    r'\brepresentation learning\b',
    r'\bmultimodal\b',
    r'\bgrounding\b',
    r'\bunderstanding\b'
]

ARCH_FAMILY_PATTERNS = {
    'transformer': [r'\bTransformer(?:s)?\b', r'\bViT\b', r'\bSwin\b', r'\bDeiT\b', r'\bCLIP\b', r'\bBERT\b', r'\bGPT-?\d*\b'],
    'cnn': [r'\bCNN(?:s)?\b', r'\bResNet(?:s)?\b', r'\bU-?Net\b'],
    'recurrent': [r'\bRNN(?:s)?\b', r'\bLSTM\b'],
    'graph': [r'\bGNN(?:s)?\b'],
    'diffusion': [r'\bDiffusion\b'],
    'mlp': [r'\bMLP\b', r'\bMultilayer Perceptron\b']
}


@lru_cache(maxsize=1)
def load_nlp():
    try:
        return spacy.load('en_core_web_sm', disable=['ner'])
    except Exception:
        nlp = spacy.blank('en')
        if 'sentencizer' not in nlp.pipe_names:
            nlp.add_pipe('sentencizer')
        return nlp


@lru_cache(maxsize=1)
def load_embedder():
    return SentenceTransformer(EMBEDDING_MODEL)


def normalize_text(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zA-Z0-9\s\-\/]', ' ', text or '')).strip()


def normalize_phrase(text: str) -> str:
    phrase = normalize_text(text).lower()
    phrase = re.sub(r'\s+', ' ', phrase).strip()
    phrase = re.sub(r'^(the|a|an)\s+', '', phrase)
    return phrase


def phrase_tokens(phrase: str) -> List[str]:
    return [token for token in re.split(r'\s+', normalize_phrase(phrase)) if token]


def jaccard(set_a: Sequence[str], set_b: Sequence[str]) -> float:
    a = {item for item in set_a if item}
    b = {item for item in set_b if item}
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)


def extract_matches(text: str, patterns: Sequence[str]) -> List[str]:
    found: List[str] = []
    for pattern in patterns:
        for match in re.findall(pattern, text, flags=re.IGNORECASE):
            if isinstance(match, tuple):
                match = match[0]
            normalized = normalize_phrase(match)
            if normalized and normalized not in found:
                found.append(normalized)
    return found


def detect_architecture_families(text: str) -> List[str]:
    families = []
    for family, patterns in ARCH_FAMILY_PATTERNS.items():
        if any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns):
            families.append(family)
    return families


def detect_tasks(text: str) -> List[str]:
    return extract_matches(text, TASK_PATTERNS)


def detect_methods(text: str) -> List[str]:
    return extract_matches(text, METHOD_PATTERNS)


def paper_text(paper: Dict[str, Any]) -> str:
    return normalize_text(f"{paper.get('title', '')}. {paper.get('abstract', '')}. {paper.get('content', '')[:12000]}")


def topic_text(topic: Dict[str, Any]) -> str:
    pieces = [topic.get('name', '') or '']
    pieces.extend(topic.get('keywords') or [])
    return normalize_text(' '.join(pieces))


def safe_year(value: Any) -> Optional[int]:
    try:
        year = int(value)
        if 1900 <= year <= 2100:
            return year
    except Exception:
        return None
    return None


def topic_year_stats(topic: Dict[str, Any], paper_by_id: Dict[str, Dict[str, Any]]) -> Tuple[Optional[float], Optional[float], Optional[int]]:
    years = []
    for paper_id in topic.get('paperIds') or []:
        paper = paper_by_id.get(paper_id)
        if not paper:
            continue
        year = safe_year(paper.get('year'))
        if year is not None:
            years.append(year)
    if not years:
        return None, None, None
    return float(sum(years) / len(years)), float(np.median(np.array(years))), max(years) - min(years)


def topic_level_terms(papers: Sequence[Dict[str, Any]]) -> Dict[str, List[str]]:
    methods: List[str] = []
    tasks: List[str] = []
    architectures: List[str] = []
    venues: List[str] = []
    domain_terms: List[str] = []
    for paper in papers:
        text = paper_text(paper)
        methods.extend(detect_methods(text))
        tasks.extend(detect_tasks(text))
        architectures.extend(detect_architecture_families(text))
        venue = normalize_phrase(paper.get('venue', '') or '')
        if venue:
            venues.append(venue)
        title_terms = [token for token in phrase_tokens(paper.get('title', '') or '') if token not in GENERIC_TERMS and len(token) > 2]
        domain_terms.extend(title_terms[:8])
    return {
        'methods': sorted(set(methods)),
        'tasks': sorted(set(tasks)),
        'architectures': sorted(set(architectures)),
        'venues': sorted(set(venues)),
        'domainTerms': sorted(set(domain_terms))
    }


def citation_proxy(papers: Sequence[Dict[str, Any]]) -> Tuple[Optional[float], bool]:
    citation_like_values = []
    for paper in papers:
        for key in ('citationCount', 'citations', 'referenceCount', 'reference_count'):
            value = paper.get(key)
            if isinstance(value, (int, float)):
                citation_like_values.append(float(value))
                break
    if not citation_like_values:
        return None, False
    avg = sum(citation_like_values) / len(citation_like_values)
    return float(np.clip(math.log1p(avg) / 10.0, 0.0, 1.0)), True


def bibliography_proxy(topic_a_papers: Sequence[Dict[str, Any]], topic_b_papers: Sequence[Dict[str, Any]]) -> float:
    venue_a = {normalize_phrase(p.get('venue', '') or '') for p in topic_a_papers if p.get('venue')}
    venue_b = {normalize_phrase(p.get('venue', '') or '') for p in topic_b_papers if p.get('venue')}
    author_a = {normalize_phrase(author) for p in topic_a_papers for author in (p.get('authors') or [])}
    author_b = {normalize_phrase(author) for p in topic_b_papers for author in (p.get('authors') or [])}
    venue_divergence = 1.0 - jaccard(list(venue_a), list(venue_b))
    author_divergence = 1.0 - jaccard(list(author_a), list(author_b))
    return float(np.clip((venue_divergence * 0.65) + (author_divergence * 0.35), 0.0, 1.0))


def topic_centroid(topic: Dict[str, Any], paper_by_id: Dict[str, Dict[str, Any]], paper_embeddings: Dict[str, np.ndarray]) -> np.ndarray:
    centroid = topic.get('centroid')
    if isinstance(centroid, list) and centroid:
        return np.asarray(centroid, dtype=float)
    vectors = []
    for paper_id in topic.get('paperIds') or []:
        vec = paper_embeddings.get(paper_id)
        if vec is not None:
            vectors.append(vec)
    if vectors:
        return np.mean(np.vstack(vectors), axis=0)
    if paper_by_id:
        # Fallback to the first paper in the corpus if the topic has no explicit embedding.
        first_vec = next(iter(paper_embeddings.values()))
        return np.asarray(first_vec, dtype=float)
    return np.zeros(384, dtype=float)


def representative_papers(topic: Dict[str, Any], paper_by_id: Dict[str, Dict[str, Any]], paper_embeddings: Dict[str, np.ndarray], top_n: int = 3) -> List[Dict[str, Any]]:
    centroid = topic_centroid(topic, paper_by_id, paper_embeddings)
    members = []
    for paper_id in topic.get('paperIds') or []:
        paper = paper_by_id.get(paper_id)
        if not paper:
            continue
        vec = paper_embeddings.get(paper_id)
        if vec is None:
            continue
        similarity = float(cosine_similarity([vec], [centroid])[0][0])
        members.append((similarity, paper))
    members.sort(key=lambda item: item[0], reverse=True)
    selected = []
    for similarity, paper in members[:top_n]:
        text = paper_text(paper)
        snippets = re.split(r'(?<=[.!?])\s+', text)
        snippet = next((s for s in snippets if s and len(s) >= 60), text[:220])
        selected.append({
            'paperId': paper.get('id'),
            'title': paper.get('title', ''),
            'snippet': snippet[:240],
            'relevance': round(similarity, 3)
        })
    return selected


def cooccurrence_bridge_papers(topic_a: Dict[str, Any], topic_b: Dict[str, Any], paper_by_id: Dict[str, Dict[str, Any]], paper_embeddings: Dict[str, np.ndarray], threshold: float = 0.30) -> List[Dict[str, Any]]:
    centroid_a = topic_centroid(topic_a, paper_by_id, paper_embeddings)
    centroid_b = topic_centroid(topic_b, paper_by_id, paper_embeddings)
    bridge_candidates = []
    for paper_id, paper in paper_by_id.items():
        vec = paper_embeddings.get(paper_id)
        if vec is None:
            continue
        sim_a = float(cosine_similarity([vec], [centroid_a])[0][0])
        sim_b = float(cosine_similarity([vec], [centroid_b])[0][0])
        if sim_a >= threshold and sim_b >= threshold:
            bridge_candidates.append((sim_a + sim_b, paper, min(sim_a, sim_b)))

    bridge_candidates.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            'paperId': paper.get('id'),
            'title': paper.get('title', ''),
            'snippet': (paper_text(paper)[:260]),
            'role': 'bridge',
            'relevance': round(relevance, 3)
        }
        for _score, paper, relevance in bridge_candidates[:3]
    ]


def format_domain_terms(terms: Sequence[str], limit: int = 3) -> str:
    cleaned = [term for term in terms if term and term not in GENERIC_TERMS]
    return ', '.join(cleaned[:limit]) if cleaned else 'the topic'


def parse_topic_components(topic: Dict[str, Any], paper_by_id: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    papers = [paper_by_id[paper_id] for paper_id in topic.get('paperIds') or [] if paper_id in paper_by_id]
    stats = topic_level_terms(papers)
    mean_year, median_year, year_span = topic_year_stats(topic, paper_by_id)
    citation_score, citation_available = citation_proxy(papers)
    return {
        'papers': papers,
        'stats': stats,
        'meanYear': mean_year,
        'medianYear': median_year,
        'yearSpan': year_span,
        'citationScore': citation_score,
        'citationAvailable': citation_available
    }


def score_pair(topic_a: Dict[str, Any], topic_b: Dict[str, Any], papers: Sequence[Dict[str, Any]], paper_by_id: Dict[str, Dict[str, Any]], paper_embeddings: Dict[str, np.ndarray], corpus_year_span: int) -> Dict[str, Any]:
    topic_a_component = parse_topic_components(topic_a, paper_by_id)
    topic_b_component = parse_topic_components(topic_b, paper_by_id)

    centroid_a = topic_centroid(topic_a, paper_by_id, paper_embeddings)
    centroid_b = topic_centroid(topic_b, paper_by_id, paper_embeddings)
    semantic_similarity = float(np.clip(cosine_similarity([centroid_a], [centroid_b])[0][0], -1.0, 1.0))
    semantic_similarity_norm = float(np.clip((semantic_similarity + 1.0) / 2.0, 0.0, 1.0))

    mean_year_a = topic_a_component['meanYear']
    mean_year_b = topic_b_component['meanYear']
    if mean_year_a is None or mean_year_b is None or corpus_year_span <= 0:
        temporal_distance = None
    else:
        temporal_distance = float(np.clip(abs(mean_year_a - mean_year_b) / max(corpus_year_span, 1), 0.0, 1.0))

    citation_available = topic_a_component['citationAvailable'] and topic_b_component['citationAvailable']
    citation_divergence = None
    if citation_available and topic_a_component['citationScore'] is not None and topic_b_component['citationScore'] is not None:
        citation_divergence = float(np.clip(abs(topic_a_component['citationScore'] - topic_b_component['citationScore']), 0.0, 1.0))

    methodology_contrast = 1.0 - jaccard(topic_a_component['stats']['methods'], topic_b_component['stats']['methods']) if (topic_a_component['stats']['methods'] or topic_b_component['stats']['methods']) else None
    task_overlap = jaccard(topic_a_component['stats']['tasks'], topic_b_component['stats']['tasks']) if (topic_a_component['stats']['tasks'] or topic_b_component['stats']['tasks']) else None

    architecture_distance = None
    if topic_a_component['stats']['architectures'] or topic_b_component['stats']['architectures']:
        architecture_distance = 1.0 - jaccard(topic_a_component['stats']['architectures'], topic_b_component['stats']['architectures'])

    topic_a_terms = topic_a_component['stats']['domainTerms'] + phrase_tokens(topic_a.get('name', '') or '') + [kw for kw in topic_a.get('keywords') or []]
    topic_b_terms = topic_b_component['stats']['domainTerms'] + phrase_tokens(topic_b.get('name', '') or '') + [kw for kw in topic_b.get('keywords') or []]
    cross_domain_rarity = 1.0 - jaccard(topic_a_terms, topic_b_terms)

    bridge_papers = cooccurrence_bridge_papers(topic_a, topic_b, paper_by_id, paper_embeddings)
    cooccurrence_count = len(bridge_papers)
    cooccurrence_scarcity = float(np.clip(1.0 - min(1.0, cooccurrence_count / max(3.0, len(papers) * 0.25)), 0.0, 1.0))

    bibliographic_divergence = bibliography_proxy(topic_a_component['papers'], topic_b_component['papers'])

    factor_weights = {
        'semanticSimilarity': 0.18,
        'temporalDistance': 0.10,
        'citationDivergence': 0.08,
        'methodologyContrast': 0.16,
        'taskOverlap': 0.10,
        'architectureDistance': 0.14,
        'crossDomainRarity': 0.12,
        'cooccurrenceScarcity': 0.22,
    }

    factor_values: Dict[str, Optional[float]] = {
        'semanticSimilarity': semantic_similarity_norm,
        'temporalDistance': temporal_distance,
        'citationDivergence': citation_divergence if citation_divergence is not None else None,
        'methodologyContrast': methodology_contrast,
        'taskOverlap': task_overlap,
        'architectureDistance': architecture_distance,
        'crossDomainRarity': cross_domain_rarity,
        'cooccurrenceScarcity': cooccurrence_scarcity,
    }

    available_weight = sum(weight for key, weight in factor_weights.items() if factor_values.get(key) is not None)
    weighted_sum = sum(weight * factor_values[key] for key, weight in factor_weights.items() if factor_values.get(key) is not None)
    base_score = weighted_sum / available_weight if available_weight else 0.0
    reliability = available_weight / sum(factor_weights.values()) if factor_weights else 0.0
    citation_missing_penalty = 1.0 if citation_divergence is None else 0.0
    gap_score = float(np.clip(base_score * (0.65 + 0.35 * reliability) * (1.0 - 0.12 * citation_missing_penalty), 0.0, 1.0))

    if gap_score >= 0.72:
        severity = 'critical'
    elif gap_score >= 0.45:
        severity = 'moderate'
    else:
        severity = 'low'

    topic_a_label = topic_a.get('name', '') or 'Topic A'
    topic_b_label = topic_b.get('name', '') or 'Topic B'
    method_phrase_a = format_domain_terms(topic_a_component['stats']['methods'])
    method_phrase_b = format_domain_terms(topic_b_component['stats']['methods'])
    task_phrase_a = format_domain_terms(topic_a_component['stats']['tasks'])
    task_phrase_b = format_domain_terms(topic_b_component['stats']['tasks'])
    architecture_phrase_a = format_domain_terms(topic_a_component['stats']['architectures'])
    architecture_phrase_b = format_domain_terms(topic_b_component['stats']['architectures'])

    if task_overlap is not None and task_overlap >= 0.4 and methodology_contrast is not None and methodology_contrast >= 0.4:
        explanation = (
            f'{topic_a_label} and {topic_b_label} show semantic proximity but remain weakly connected in the corpus. '
            f'Both are tied to {task_phrase_a if task_phrase_a != "the topic" else task_phrase_b}, but they rely on different methods: '
            f'{method_phrase_a} versus {method_phrase_b}. '
            f'This contrast suggests a plausible research bridge if the stronger method family is adapted to the other task setting.'
        )
    elif architecture_distance is not None and architecture_distance >= 0.5:
        explanation = (
            f'The literature shows limited bridging between {topic_a_label} and {topic_b_label}. '
            f'The architecture shift from {architecture_phrase_a} to {architecture_phrase_b} is substantial, while co-occurrence remains sparse. '
            f'This points to an underexplored opportunity to transfer architectural ideas across the two topic areas.'
        )
    else:
        explanation = (
            f'{topic_a_label} and {topic_b_label} are semantically close, but the corpus contains few papers that connect them directly. '
            f'Their methods and domain terms differ enough to indicate a potentially useful but underexplored intersection.'
        )

    if citation_divergence is None:
        explanation += ' Citation counts were not available in the corpus, so citation divergence is treated as unavailable rather than inferred.'

    temporal_note = None
    if mean_year_a is not None and mean_year_b is not None:
        temporal_note = f'{round(mean_year_a)} vs {round(mean_year_b)}'

    return {
        'gapId': None,
        'topicA': topic_a.get('topicId'),
        'topicB': topic_b.get('topicId'),
        'topicALabel': topic_a_label,
        'topicBLabel': topic_b_label,
        'similarity': round(semantic_similarity_norm, 3),
        'temporalDistance': None if temporal_distance is None else round(temporal_distance, 3),
        'citationDivergence': None if citation_divergence is None else round(citation_divergence, 3),
        'citationAvailable': citation_divergence is not None,
        'bibliographicDivergence': round(bibliographic_divergence, 3),
        'methodologyContrast': None if methodology_contrast is None else round(methodology_contrast, 3),
        'taskOverlap': None if task_overlap is None else round(task_overlap, 3),
        'architectureDistance': None if architecture_distance is None else round(architecture_distance, 3),
        'crossDomainRarity': round(cross_domain_rarity, 3),
        'coOccurrence': cooccurrence_count,
        'coOccurrenceScarcity': round(cooccurrence_scarcity, 3),
        'gapScore': round(gap_score, 3),
        'severity': severity,
        'evidencePaperIds': [item['paperId'] for item in bridge_papers],
        'evidenceSnippets': bridge_papers,
        'recommendation': explanation,
        'explanation': explanation,
        'confidence': round(reliability, 3),
        'scoreComponents': {
            'semanticSimilarity': round(semantic_similarity_norm, 3),
            'temporalDistance': None if temporal_distance is None else round(temporal_distance, 3),
            'citationDivergence': None if citation_divergence is None else round(citation_divergence, 3),
            'methodologyContrast': None if methodology_contrast is None else round(methodology_contrast, 3),
            'taskOverlap': None if task_overlap is None else round(task_overlap, 3),
            'architectureDistance': None if architecture_distance is None else round(architecture_distance, 3),
            'crossDomainRarity': round(cross_domain_rarity, 3),
            'coOccurrenceScarcity': round(cooccurrence_scarcity, 3),
        },
        'reliability': round(reliability, 3),
        'temporalNote': temporal_note,
        'bridgeCandidates': bridge_papers,
        'citationSignalNote': 'unavailable' if citation_divergence is None else 'available'
    }


def analyze_gaps(papers: Sequence[Dict[str, Any]], topics: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    paper_by_id = {paper.get('id'): paper for paper in papers if paper.get('id')}
    if not topics:
        return {
            'engine': 'python-gap-engine',
            'formula': 'multi-factor gap score using semantic, temporal, methodology, task, architecture, rarity, and co-occurrence signals',
            'gaps': [],
            'warnings': ['No topics were provided for gap detection.']
        }

    paper_embeddings = load_embedder().encode([paper_text(paper) for paper in papers], normalize_embeddings=True)
    embedding_lookup = {paper.get('id'): paper_embeddings[index] for index, paper in enumerate(papers) if paper.get('id')}
    corpus_years = [safe_year(paper.get('year')) for paper in papers]
    valid_years = [year for year in corpus_years if year is not None]
    corpus_year_span = (max(valid_years) - min(valid_years)) if len(valid_years) >= 2 else 0

    scored_pairs = []
    for i in range(len(topics)):
        for j in range(i + 1, len(topics)):
            pair = score_pair(topics[i], topics[j], papers, paper_by_id, embedding_lookup, corpus_year_span)
            pair['gapId'] = f'G{len(scored_pairs) + 1}'
            scored_pairs.append(pair)

    scored_pairs.sort(key=lambda item: item['gapScore'], reverse=True)
    for index, pair in enumerate(scored_pairs, start=1):
        pair['gapId'] = f'G{index}'
        pair['rank'] = index

    return {
        'engine': 'python-gap-engine',
        'formula': 'gapScore = weighted mean of semantic similarity, temporal distance, methodology contrast, task overlap, architecture distance, cross-domain rarity, and co-occurrence scarcity, reduced by missing evidence',
        'gaps': scored_pairs,
        'topicCount': len(topics),
        'paperCount': len(papers),
        'warnings': []
    }


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw or '{}')
    result = analyze_gaps(payload.get('papers', []), payload.get('topics', []))
    json.dump(result, sys.stdout, ensure_ascii=True)


if __name__ == '__main__':
    main()