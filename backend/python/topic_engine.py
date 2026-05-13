from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import Counter, defaultdict
from functools import lru_cache
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import spacy
from bertopic import BERTopic
from bertopic.representation import KeyBERTInspired
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity


GENERIC_TERMS = {
    'image', 'images', 'system', 'systems', 'computer', 'computers', 'network', 'networks',
    'model', 'models', 'method', 'methods', 'data', 'dataset', 'datasets', 'task', 'tasks',
    'approach', 'approaches', 'framework', 'frameworks', 'analysis', 'analyses', 'performance',
    'learning', 'research', 'study', 'studies', 'paper', 'papers', 'result', 'results',
    'baseline', 'baselines', 'algorithm', 'algorithms', 'technique', 'techniques', 'problem',
    'problems', 'feature', 'features', 'experiment', 'experiments', 'evaluation', 'evaluations',
    'training', 'train', 'trained', 'test', 'testing', 'prediction', 'predictions', 'prediction',
    'vision', 'computer vision', 'deep learning', 'machine learning', 'artificial intelligence'
}

ALLOWED_ACRONYMS = {
    'cnn', 'cnns', 'rnn', 'rnns', 'gnn', 'gnns', 'vit', 'llm', 'llms', 'gan', 'gans',
    'mri', 'ct', 'pet', 'nlp', 'clip', 'bert', 'resnet', 'unet', 'u-net', 'vae', 'svm', 'dnn'
}

LABEL_PREFIX_TERMS = {
    'transformer', 'transformers', 'vision', 'biomedical', 'clinical', 'medical', 'multimodal',
    'residual', 'cnn', 'cnns', 'u-net', 'unet', 'graph', 'knowledge', 'cross', 'temporal'
}

LABEL_TASK_TERMS = {
    'segmentation', 'generation', 'detection', 'retrieval', 'classification', 'recognition',
    'representation', 'learning', 'architecture', 'radiology', 'imaging', 'lesion', 'report',
    'embedding', 'reasoning', 'inference', 'localization', 'analysis', 'prediction', 'planning',
    'translation', 'diagnosis'
}

LABEL_FOLLOW_TERMS = {
    'maps', 'attention', 'modeling', 'modelling', 'networks', 'network', 'systems', 'workflow',
    'workflows', 'pipeline', 'pipelines', 'study', 'studies', 'based', 'driven', 'supported'
}

EMBEDDING_MODEL = os.getenv('RESEARCHLENS_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')


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


@lru_cache(maxsize=1)
def load_keybert():
    return KeyBERT(model=load_embedder())


def normalize_text(text: str) -> str:
    cleaned = re.sub(r'(\w)-\s+(\w)', r'\1\2', text or '')
    cleaned = re.sub(r'\s+', ' ', re.sub(r'[^a-zA-Z0-9\s\-\/]', ' ', cleaned)).strip()
    return cleaned


def normalize_phrase(text: str) -> str:
    phrase = normalize_text(text).lower()
    phrase = re.sub(r'\s+', ' ', phrase).strip()
    phrase = re.sub(r'^(the|a|an)\s+', '', phrase)
    return phrase


def phrase_tokens(phrase: str) -> List[str]:
    return [token for token in re.split(r'\s+', normalize_phrase(phrase)) if token]


def is_generic_single_term(phrase: str) -> bool:
    tokens = phrase_tokens(phrase)
    if not tokens:
        return True
    if len(tokens) == 1:
        token = tokens[0]
        return token in GENERIC_TERMS and token not in ALLOWED_ACRONYMS
    return False


def generic_term_penalty(phrase: str) -> float:
    tokens = phrase_tokens(phrase)
    if not tokens:
        return 1.0
    generic_hits = sum(1 for token in tokens if token in GENERIC_TERMS and token not in ALLOWED_ACRONYMS)
    if generic_hits == len(tokens):
        return 1.0
    if generic_hits:
        return 0.15 * generic_hits
    return 0.0


def title_overlap_ratio(phrase: str, titles: Sequence[str]) -> float:
    phrase_tokens_set = set(phrase_tokens(phrase))
    if not phrase_tokens_set:
        return 1.0

    best_overlap = 0.0
    for title in titles:
        title_tokens_set = set(phrase_tokens(title))
        if not title_tokens_set:
            continue
        overlap = len(phrase_tokens_set & title_tokens_set) / max(1, len(phrase_tokens_set))
        best_overlap = max(best_overlap, overlap)
    return best_overlap


def anchor_hit_count(phrase: str) -> int:
    tokens = phrase_tokens(phrase)
    return sum(1 for token in tokens if token in LABEL_PREFIX_TERMS or token in LABEL_TASK_TERMS)


def task_hit_count(phrase: str) -> int:
    tokens = phrase_tokens(phrase)
    return sum(1 for token in tokens if token in LABEL_TASK_TERMS)


def clean_label_phrase(phrase: str) -> str:
    tokens = phrase_tokens(phrase)
    if not tokens:
        return phrase

    start_indexes = [i for i, token in enumerate(tokens) if token in LABEL_PREFIX_TERMS or token in LABEL_TASK_TERMS]
    start = start_indexes[0] if start_indexes else 0

    task_indexes = [i for i, token in enumerate(tokens[start:], start) if token in LABEL_TASK_TERMS]
    if task_indexes:
        end = task_indexes[-1] + 1
    else:
        end = min(len(tokens), start + 3)
        while end < len(tokens) and tokens[end] in LABEL_FOLLOW_TERMS:
            end += 1

    cleaned = ' '.join(tokens[start:end]).strip()
    return cleaned or ' '.join(tokens[:4]).strip()


def is_title_like_phrase(phrase: str, titles: Sequence[str]) -> bool:
    if not phrase:
        return False
    overlap = title_overlap_ratio(phrase, titles)
    if overlap >= 0.95:
        return True
    tokens = phrase_tokens(phrase)
    if len(tokens) <= 2 and overlap >= 0.65:
        return True
    return False


def is_weak_label_phrase(phrase: str) -> bool:
    tokens = phrase_tokens(phrase)
    if len(tokens) < 2:
        return True
    if len(tokens) == 2 and tokens[0] in {'imaging', 'language', 'report', 'attention', 'maps'} and tokens[1] not in {'segmentation', 'generation', 'detection', 'retrieval', 'classification', 'recognition', 'representation', 'learning', 'architecture', 'analysis', 'localization'}:
        return True
    return False


def paper_text(paper: Dict[str, Any]) -> str:
    title = paper.get('title', '') or ''
    abstract = paper.get('abstract', '') or ''
    content = paper.get('content', '') or ''
    return normalize_text(f'{title}. {abstract}. {content[:12000]}')


def normalize_papers(papers: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized = []
    for index, paper in enumerate(papers or []):
        normalized.append({
            'id': paper.get('id') or f'P{index + 1}',
            'title': paper.get('title') or f'Untitled Paper {index + 1}',
            'authors': paper.get('authors') if isinstance(paper.get('authors'), list) else [],
            'year': int(paper.get('year') or 2024),
            'abstract': paper.get('abstract') or '',
            'content': paper.get('content') or paper.get('abstract') or ''
        })
    return normalized


def safe_noun_chunks(doc) -> List[Any]:
    if not getattr(doc, 'has_annotation', None):
        return []
    if not doc.has_annotation('DEP'):
        return []
    try:
        return list(doc.noun_chunks)
    except Exception:
        return []


def extract_noun_phrases(texts: Sequence[str]) -> Counter:
    nlp = load_nlp()
    counts: Counter = Counter()
    for text in texts:
        doc = nlp(text)
        for chunk in safe_noun_chunks(doc):
            phrase = normalize_phrase(chunk.text)
            if not phrase:
                continue
            tokens = phrase_tokens(phrase)
            if len(tokens) == 1 and is_generic_single_term(phrase):
                continue
            if len(tokens) > 5:
                continue
            counts[phrase] += 1
    return counts


def extract_keybert_phrases(text: str, top_n: int = 20) -> List[Tuple[str, float]]:
    text = normalize_text(text)
    if not text:
        return []
    kw_model = load_keybert()
    try:
        phrases = kw_model.extract_keywords(
            text[:12000],
            keyphrase_ngram_range=(1, 4),
            stop_words='english',
            top_n=top_n,
            use_mmr=True,
            diversity=0.45
        )
    except Exception:
        phrases = kw_model.extract_keywords(
            text[:12000],
            keyphrase_ngram_range=(1, 3),
            stop_words='english',
            top_n=top_n
        )
    cleaned: List[Tuple[str, float]] = []
    for phrase, score in phrases:
        normalized = normalize_phrase(phrase)
        if normalized:
            cleaned.append((normalized, float(score)))
    return cleaned


def sentence_embedding(text: str) -> np.ndarray:
    return load_embedder().encode([text], normalize_embeddings=True)[0]


def score_candidate(
    phrase: str,
    centroid: np.ndarray,
    phrase_embeddings: Dict[str, np.ndarray],
    phrase_freq: Counter,
    title_freq: Counter,
    noun_freq: Counter,
    topic_words: Counter,
    titles: Sequence[str],
) -> float:
    if not phrase or is_generic_single_term(phrase):
        return -1.0

    tokens = phrase_tokens(phrase)
    if not tokens:
        return -1.0

    embedding = phrase_embeddings.get(phrase)
    if embedding is None:
        embedding = sentence_embedding(phrase)
        phrase_embeddings[phrase] = embedding

    similarity = float(cosine_similarity([embedding], [centroid])[0][0])
    frequency = min(1.0, phrase_freq.get(phrase, 0) / max(1, sum(phrase_freq.values())))
    title_bonus = min(1.0, title_freq.get(phrase, 0) / max(1, sum(title_freq.values())))
    noun_bonus = min(1.0, noun_freq.get(phrase, 0) / max(1, sum(noun_freq.values())))
    topic_word_bonus = min(1.0, topic_words.get(phrase, 0) / max(1, sum(topic_words.values())))
    specificity = min(1.0, 0.2 * len(tokens) + 0.15 * sum(1 for token in tokens if len(token) >= 6))
    penalty = generic_term_penalty(phrase)
    title_penalty = 0.0
    if is_title_like_phrase(phrase, titles):
        title_penalty += 0.35
    elif title_overlap_ratio(phrase, titles) >= 0.5:
        title_penalty += 0.15

    task_hits = task_hit_count(phrase)
    prefix_hits = anchor_hit_count(phrase) - task_hits
    anchor_bonus = min(0.28, 0.09 * task_hits + 0.03 * prefix_hits)
    if len(tokens) >= 3:
        anchor_bonus += 0.04
    if task_hits >= 2:
        title_penalty *= 0.55

    score = (
        0.40 * max(0.0, similarity) +
        0.20 * frequency +
        0.15 * title_bonus +
        0.10 * noun_bonus +
        0.10 * topic_word_bonus +
        0.05 * specificity -
        penalty -
        title_penalty
        + anchor_bonus
    )
    return float(score)


def build_label(candidates: List[Tuple[str, float]], titles: List[str], title_counter: Counter | None = None) -> str:
    if not candidates:
        return 'Research Topic'

    title_counter = title_counter or Counter()
    semantic_candidates = [clean_label_phrase(phrase) for phrase, _score in candidates if not is_title_like_phrase(phrase, titles)]
    if not semantic_candidates:
        semantic_candidates = [clean_label_phrase(phrase) for phrase, _score in candidates]

    semantic_candidates = [phrase for phrase in semantic_candidates if not is_weak_label_phrase(phrase)] or semantic_candidates

    top = semantic_candidates[:4]
    if len(top) == 1:
        label = top[0]
    else:
        first, second = top[0], top[1]
        first_words = set(phrase_tokens(first))
        second_words = set(phrase_tokens(second))
        if len(phrase_tokens(first)) >= 3 and task_hit_count(first) >= 1:
            label = first
        elif first_words & second_words:
            label = first
        else:
            label = f'{first} & {second}'

    label = re.sub(r'\s+', ' ', label).strip()
    if len(label.split()) > 7:
        label = ' '.join(label.split()[:7])

    if is_title_like_phrase(label, titles) or is_weak_label_phrase(label):
        title_candidates = [phrase for phrase, _count in title_counter.most_common(8)
                            if phrase and not is_generic_single_term(phrase) and not is_title_like_phrase(phrase, titles)]
        strong_candidates = [clean_label_phrase(phrase) for phrase in title_candidates if not is_weak_label_phrase(clean_label_phrase(phrase))]
        if strong_candidates:
            label = strong_candidates[0]

    return format_label_phrase(label)


def format_label_phrase(label: str) -> str:
    connective_words = {'and', 'or', 'for', 'of', 'in', 'on', 'to', 'with', 'via', 'the'}
    parts = []
    for token in re.split(r'(\s+|&|/|-)', label):
        if not token or token.isspace() or token in {'&', '/', '-'}:
            parts.append(token)
            continue
        normalized = token.lower()
        if normalized in ALLOWED_ACRONYMS:
            parts.append(normalized.upper())
        elif normalized in connective_words:
            parts.append(normalized)
        elif len(token) <= 3 and token.isalpha():
            parts.append(token.upper())
        else:
            parts.append(token[:1].upper() + token[1:])
    return ''.join(parts)


def compact_phrase(phrase: str) -> str:
    phrase = re.sub(r'\s+', ' ', phrase).strip()
    phrase = re.sub(r'\b(?:and|or|the|for|of|in|on|to|with|via)\b', '', phrase, flags=re.IGNORECASE)
    phrase = re.sub(r'\s+', ' ', phrase).strip(' -_/')
    return phrase


def build_summary_prompt(label: str, titles: List[str], phrases: List[str], sentences: List[str]) -> str:
    title_block = '\n'.join(f'- {title}' for title in titles[:5]) or '- No titles available'
    phrase_block = ', '.join(phrases[:10]) or 'No extracted phrases'
    sentence_block = '\n'.join(f'- {sentence}' for sentence in sentences[:4]) or '- No representative sentences'
    return (
        'You are labeling an arXiv-style research topic.\n'
        'Return a concise research-domain label and a two-sentence summary grounded in the evidence.\n'
        'Do not output generic keyword dumps or unsupported claims.\n\n'
        f'Current label candidate: {label}\n\n'
        f'Representative titles:\n{title_block}\n\n'
        f'Top evidence phrases:\n{phrase_block}\n\n'
        f'Representative sentences:\n{sentence_block}\n'
    )


def select_representative_sentences(texts: List[str], centroid: np.ndarray) -> List[str]:
    nlp = load_nlp()
    sentence_candidates: List[str] = []
    for text in texts:
        doc = nlp(text)
        for sent in doc.sents:
            sentence = normalize_phrase(sent.text)
            if 20 <= len(sentence) <= 220 and len(sentence.split()) >= 5:
                sentence_candidates.append(sentence)

    if not sentence_candidates:
        return []

    sentence_embeddings = load_embedder().encode(sentence_candidates, normalize_embeddings=True)
    scores = cosine_similarity(sentence_embeddings, [centroid]).reshape(-1)
    ranked = sorted(zip(sentence_candidates, scores), key=lambda item: item[1], reverse=True)
    return [sentence for sentence, _score in ranked[:4]]


def cluster_with_agglomerative(embeddings: np.ndarray) -> List[int]:
    doc_count = len(embeddings)
    if doc_count == 1:
        return [0]
    if doc_count == 2:
        similarity = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        if similarity > 0.78:
            return [0, 0]
        return [0, 1]
    n_clusters = min(max(2, int(round(math.sqrt(doc_count)))), doc_count)
    model = AgglomerativeClustering(n_clusters=n_clusters, metric='cosine', linkage='average')
    return list(model.fit_predict(embeddings))


def cluster_with_bertopic(texts: List[str], embeddings: np.ndarray) -> Tuple[List[int], str]:
    min_topic_size = max(2, min(5, len(texts) // 3 or 2))
    topic_model = BERTopic(
        embedding_model=load_embedder(),
        representation_model=KeyBERTInspired(),
        min_topic_size=min_topic_size,
        calculate_probabilities=True,
        verbose=False,
        nr_topics='auto'
    )
    topics, _probs = topic_model.fit_transform(texts, embeddings)
    if all(topic == -1 for topic in topics):
        return cluster_with_agglomerative(embeddings), 'agglomerative-cosine'
    return list(topics), 'bertopic-keybert'


def remap_topic_ids(assignments: List[int], embeddings: np.ndarray) -> List[int]:
    groups: Dict[int, List[int]] = defaultdict(list)
    for index, topic_id in enumerate(assignments):
        groups[topic_id].append(index)

    if not any(topic_id != -1 for topic_id in groups):
        return cluster_with_agglomerative(embeddings)

    centroids = {
        topic_id: np.mean(embeddings[indexes], axis=0)
        for topic_id, indexes in groups.items()
        if topic_id != -1
    }

    if -1 in groups and centroids:
        topic_ids = list(centroids.keys())
        centroid_matrix = np.vstack([centroids[topic_id] for topic_id in topic_ids])
        for index in groups[-1]:
            sims = cosine_similarity([embeddings[index]], centroid_matrix).reshape(-1)
            best_topic = topic_ids[int(np.argmax(sims))]
            assignments[index] = best_topic

    unique_topics = sorted(set(assignments))
    topic_map = {topic_id: i for i, topic_id in enumerate(unique_topics)}
    return [topic_map[topic_id] for topic_id in assignments]


def analyze_topics(papers: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    normalized = normalize_papers(papers)
    if not normalized:
        return {
            'engine': 'python-topic-modeling',
            'clusteringMethod': 'none',
            'topics': [],
            'assignments': [],
            'vocabulary': [],
            'warnings': ['No papers provided for topic modeling.']
        }

    texts = [paper_text(paper) for paper in normalized]
    embeddings = load_embedder().encode(texts, normalize_embeddings=True)

    if len(normalized) < 3:
        assignments = [0 for _paper in normalized]
        cluster_method = 'single-topic-small-corpus'
    else:
        try:
            raw_assignments, cluster_method = cluster_with_bertopic(texts, embeddings)
            assignments = remap_topic_ids(raw_assignments, embeddings)
        except Exception:
            assignments = cluster_with_agglomerative(embeddings)
            cluster_method = 'agglomerative-cosine'

    topic_groups: Dict[int, List[int]] = defaultdict(list)
    for index, topic_id in enumerate(assignments):
        topic_groups[topic_id].append(index)

    topic_order = sorted(topic_groups.items(), key=lambda item: (-len(item[1]), min(item[1])))

    global_candidate_counter: Counter = Counter()
    for text in texts:
        for phrase, score in extract_keybert_phrases(text, top_n=8):
            if not is_generic_single_term(phrase):
                global_candidate_counter[phrase] += max(1.0, score * 2)

    topics: List[Dict[str, Any]] = []
    for topic_index, (_topic_id, member_indexes) in enumerate(topic_order):
        member_papers = [normalized[index] for index in member_indexes]
        member_texts = [texts[index] for index in member_indexes]
        member_embeddings = embeddings[member_indexes]
        centroid = np.mean(member_embeddings, axis=0)
        doc_similarities = cosine_similarity(member_embeddings, [centroid]).reshape(-1)
        coherence = float(np.clip(np.mean(doc_similarities), 0.0, 1.0))

        title_phrases: Counter = Counter()
        nlp = load_nlp()
        for paper in member_papers:
            title_phrase = normalize_phrase(paper['title'])
            if title_phrase:
                title_phrases[title_phrase] += 3
            title_doc = nlp(normalize_text(paper['title']))
            for chunk in safe_noun_chunks(title_doc):
                phrase = normalize_phrase(chunk.text)
                if phrase:
                    title_phrases[phrase] += 2

        noun_phrases = extract_noun_phrases(member_texts)
        combined_text = ' '.join(member_texts)
        keybert_phrases = extract_keybert_phrases(combined_text, top_n=25)
        keybert_counter = Counter(dict(keybert_phrases))

        representative_titles = [paper['title'] for paper, _score in sorted(
            zip(member_papers, doc_similarities),
            key=lambda item: item[1],
            reverse=True
        )[:4]]

        candidate_counter: Counter = Counter()
        for phrase, score in keybert_phrases:
            if not is_generic_single_term(phrase):
                candidate_counter[phrase] += max(1.0, score * 5)
        for phrase, count in noun_phrases.items():
            if not is_generic_single_term(phrase):
                candidate_counter[phrase] += float(count)
        for phrase, count in title_phrases.items():
            if not is_generic_single_term(phrase):
                candidate_counter[phrase] += float(count) * 1.5
        for phrase, count in global_candidate_counter.items():
            if phrase in combined_text.lower():
                candidate_counter[phrase] += float(count) * 0.25

        candidate_counter = Counter({
            compact_phrase(phrase): count
            for phrase, count in candidate_counter.items()
            if compact_phrase(phrase)
        })

        phrase_embeddings: Dict[str, np.ndarray] = {}
        scored_candidates: List[Tuple[str, float]] = []
        for phrase, _count in candidate_counter.most_common(60):
            score = score_candidate(
                phrase,
                centroid,
                phrase_embeddings,
                candidate_counter,
                title_phrases,
                noun_phrases,
                keybert_counter,
                representative_titles
            )
            if score > 0:
                scored_candidates.append((phrase, score))

        scored_candidates.sort(key=lambda item: item[1], reverse=True)
        selected_keywords = [phrase for phrase, _score in scored_candidates[:10] if not is_title_like_phrase(phrase, representative_titles)]
        if not selected_keywords:
            selected_keywords = [phrase for phrase, _score in keybert_phrases[:5] if phrase]

        representative_sentences = select_representative_sentences(member_texts, centroid)
        label = build_label(scored_candidates, representative_titles, title_phrases)
        summary_prompt = build_summary_prompt(label, representative_titles, selected_keywords, representative_sentences)

        title_overlap = sum(1 for title in representative_titles if normalize_phrase(title) in selected_keywords)
        label_confidence = float(np.clip(
            (coherence * 0.5) +
            (min(1.0, len(selected_keywords) / 8.0) * 0.2) +
            (min(1.0, title_overlap / max(1, len(representative_titles))) * 0.3),
            0.0,
            1.0
        ))

        topics.append({
            'topicId': f'T{topic_index + 1}',
            'name': label,
            'keywords': selected_keywords,
            'paperIds': [paper['id'] for paper in member_papers],
            'centroid': centroid.tolist(),
            'coherence': round(coherence, 3),
            'labelConfidence': round(label_confidence, 3),
            'summary': ' '.join(representative_sentences[:2]) if representative_sentences else '',
            'summaryPrompt': summary_prompt,
            'representativeTitles': representative_titles,
            'labelStrategy': 'title-aware keybert noun-phrase synthesis',
            'clusterSize': len(member_papers)
        })

    assignment_lookup = {paper['id']: topics[assignments[index]]['topicId'] for index, paper in enumerate(normalized)}
    vocabulary = sorted({phrase for topic in topics for phrase in topic['keywords']})

    return {
        'engine': 'python-topic-modeling',
        'clusteringMethod': cluster_method,
        'embeddingModel': EMBEDDING_MODEL,
        'topics': topics,
        'assignments': [
            {'paperId': paper['id'], 'topicId': assignment_lookup[paper['id']]}
            for paper in normalized
        ],
        'vocabulary': vocabulary,
        'topicCount': len(topics),
        'warnings': []
    }


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw or '{}')
    papers = payload.get('papers', [])
    result = analyze_topics(papers)
    json.dump(result, sys.stdout, ensure_ascii=True)


if __name__ == '__main__':
    main()