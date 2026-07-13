"""Deterministic, review-only matching from an inbox document to LARO cases."""

from __future__ import annotations

import math
import re
import unicodedata
from typing import Any, Dict, Iterable, List, Set


_TOKEN_PATTERN = re.compile(r"[a-z0-9][a-z0-9._-]{2,}", re.IGNORECASE)
_STOP_WORDS = {
    "aan", "als", "and", "bij", "case", "dan", "dat", "de", "decision", "document",
    "een", "en", "for", "from", "het", "in", "inzake", "is", "letter", "met", "naar",
    "not", "of", "om", "on", "onder", "over", "reference", "the", "this", "tot", "uit",
    "van", "voor", "was", "werd", "with", "zaak",
}


def _fold(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "")).casefold()
    return "".join(character for character in normalized if not unicodedata.combining(character))


def _tokens(*values: Any) -> Set[str]:
    text = " ".join(_fold(value) for value in values if value not in (None, ""))
    return {
        token.strip("._-")
        for token in _TOKEN_PATTERN.findall(text)
        if token.strip("._-") and token.strip("._-") not in _STOP_WORDS
    }


def _contains_phrase(haystack: str, value: Any) -> bool:
    phrase = _fold(value).strip()
    if not phrase:
        return False
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", haystack))


def _document_text(document: Dict[str, Any]) -> str:
    analysis = document.get("analysis") or document.get("legal_analysis") or {}
    facts = analysis.get("facts") or {}
    return " ".join(str(value or "") for value in (
        document.get("title"),
        document.get("original_filename"),
        document.get("sender"),
        document.get("recipient"),
        document.get("source_uri"),
        document.get("summary"),
        document.get("extracted_text"),
        document.get("ocr_text"),
        " ".join(str(item) for item in analysis.get("topics") or []),
        " ".join(str(item) for item in facts.get("parties") or []),
        " ".join(str(item) for item in facts.get("legal_references") or []),
    ))


def _case_text(case: Dict[str, Any]) -> str:
    parties = [item.get("name") if isinstance(item, dict) else item for item in case.get("parties") or []]
    identifiers = [
        (item.get("identifier_value") or item.get("value")) if isinstance(item, dict) else item
        for item in case.get("identifiers") or []
    ]
    return " ".join(str(value or "") for value in (
        case.get("title"),
        case.get("description"),
        case.get("current_summary"),
        case.get("desired_outcome"),
        case.get("legal_domain"),
        case.get("court_or_institution"),
        " ".join(str(item) for item in case.get("opposing_parties") or []),
        " ".join(str(item or "") for item in parties),
        " ".join(str(item or "") for item in identifiers),
    ))


def rank_document_cases(
    document: Dict[str, Any],
    cases: Iterable[Dict[str, Any]],
    *,
    limit: int = 3,
) -> List[Dict[str, Any]]:
    """Return bounded case suggestions; every result remains a human decision."""
    document_text = _document_text(document)
    folded_document = _fold(document_text)
    document_tokens = _tokens(document_text)
    analysis = document.get("analysis") or document.get("legal_analysis") or {}
    analysis_topics = {_fold(item).replace(" ", "_") for item in analysis.get("topics") or []}
    ranked: List[Dict[str, Any]] = []

    for case in cases or []:
        case_id = case.get("case_id") or case.get("id")
        if not case_id:
            continue
        score = 0.0
        reasons: List[str] = []

        identifiers = [
            (item.get("identifier_value") or item.get("value")) if isinstance(item, dict) else item
            for item in case.get("identifiers") or []
        ]
        identifier_hits = [
            str(identifier)
            for identifier in identifiers
            if len(str(identifier or "").strip()) >= 4 and _fold(identifier) in folded_document
        ]
        if identifier_hits:
            score += min(64, 52 + (len(identifier_hits) - 1) * 6)
            reasons.append(f"case reference {identifier_hits[0]} appears in the source")

        named_entities = []
        for party in case.get("parties") or []:
            name = party.get("name") if isinstance(party, dict) else party
            if name:
                named_entities.append(str(name))
        named_entities.extend(str(item) for item in case.get("opposing_parties") or [] if item)
        institution = str(case.get("court_or_institution") or "").strip()
        if institution:
            named_entities.append(institution)
        entity_hits = [
            name for name in dict.fromkeys(named_entities)
            if len(name.strip()) >= 3 and _contains_phrase(folded_document, name)
        ]
        if entity_hits:
            score += min(42, 22 + (len(entity_hits) - 1) * 10)
            reasons.append(f"named party or institution matches {entity_hits[0]}")

        legal_domain = _fold(case.get("legal_domain") or "unknown").replace(" ", "_")
        if legal_domain not in {"", "unknown", "general", "general_law"} and legal_domain in analysis_topics:
            score += 18
            reasons.append(f"document topic matches {str(case.get('legal_domain')).replace('_', ' ')}")

        title_tokens = _tokens(case.get("title"))
        title_overlap = title_tokens & document_tokens
        if title_overlap:
            title_score = min(22, 8 + (14 * len(title_overlap) / max(1, len(title_tokens))))
            score += title_score
            reasons.append(f"case-title terms match: {', '.join(sorted(title_overlap)[:3])}")

        case_tokens = _tokens(_case_text(case))
        overlap = case_tokens & document_tokens
        if overlap:
            overlap_score = min(24, 24 * len(overlap) / max(4.0, math.sqrt(len(case_tokens) * len(document_tokens))))
            score += overlap_score
            if not title_overlap:
                reasons.append(f"case-context terms match: {', '.join(sorted(overlap)[:3])}")

        normalized_score = round(min(100.0, score), 1)
        if normalized_score < 12:
            continue
        confidence = "high" if normalized_score >= 65 else "medium" if normalized_score >= 35 else "low"
        ranked.append({
            "case_id": int(case_id),
            "case_title": case.get("title") or f"Case {case_id}",
            "score": normalized_score,
            "confidence": confidence,
            "reasons": reasons[:4],
            "requires_review": True,
        })

    ranked.sort(key=lambda item: (-float(item["score"]), int(item["case_id"])))
    return ranked[: max(1, min(int(limit or 3), 5))]
