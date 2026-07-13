"""
Lawyer matching engine for LARO.

The public NOvA lawyer finder is filter-driven: legal subject, lawyer name,
location/radius, specialization association membership, and financed legal aid.
This module models those filters explicitly and ranks candidate lawyers against
the case intelligence that LARO already builds from documents.
"""

from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

from dutch_legal_taxonomy import (
    DUTCH_LEGAL_AREAS,
    infer_legal_fields as infer_dutch_legal_fields,
    legal_field_ids,
    legal_field_terms,
    normalize_legal_fields as normalize_dutch_legal_fields,
)

NOVA_BASE_URL = "https://zoekeenadvocaat.advocatenorde.nl"
NOVA_DIRECTORY_NOTICE = (
    "NOvA publishes directory data supplied by lawyers and third parties and does not guarantee "
    "that every public field is accurate or complete. LARO ranks official search results for review; "
    "it does not endorse or select counsel."
)

# The official ids are kept in the shared taxonomy so case intake, matching,
# API output, and UI controls cannot drift into different legal vocabularies.
NOVA_FIELD_IDS = legal_field_ids()
FIELD_TO_NOVA_TERMS = {
    area["key"]: [area["name_nl"], *area["subareas"]]
    for area in DUTCH_LEGAL_AREAS
}


@dataclass
class NovaSearchCriteria:
    legal_fields: List[str] = field(default_factory=list)
    explicit_legal_fields: List[str] = field(default_factory=list)
    inferred_legal_fields: List[str] = field(default_factory=list)
    nova_subject_terms: List[str] = field(default_factory=list)
    nova_subject_ids: List[int] = field(default_factory=list)
    nova_specialization_ids: List[int] = field(default_factory=list)
    case_summary: str = ""
    case_description: str = ""
    postcode_or_city: str = ""
    radius_km: int = 50
    requires_financed_legal_aid: bool = False
    prefer_specialization_association: bool = True
    require_specialization_association: bool = False
    lawyer_name: str = ""
    language: str = "nl"
    urgency: str = "normal"
    complexity: str = "medium"
    evidence_topics: List[str] = field(default_factory=list)
    case_source_coverage: Dict[str, int] = field(default_factory=dict)
    max_results: int = 30
    resolved_location: Dict[str, str] = field(default_factory=dict)


class NovaDirectoryClient:
    """Read-only adapter for the public NOvA lawyer finder."""

    def __init__(self, base_url: str = NOVA_BASE_URL, timeout_seconds: int = 15):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def build_search_url(
        self,
        criteria: NovaSearchCriteria,
        subject_ids: Optional[Sequence[int]] = None,
    ) -> str:
        params = self._official_filter_params(criteria, subject_ids=subject_ids)
        params["weergave"] = "lijst"
        suffix = f"?{urlencode(params)}" if params else ""
        return f"{self.base_url}/zoeken{suffix}"

    def search(
        self,
        criteria: NovaSearchCriteria,
        records: Optional[Sequence[Dict[str, Any]]] = None,
    ) -> Tuple[List[Dict[str, Any]], str, Dict[str, Any]]:
        if records is not None:
            return (
                [normalize_lawyer_record(record) for record in records],
                "provided",
                {"source": "provided_candidates"},
            )

        configured_records = self._load_configured_records()
        if configured_records:
            return (
                [normalize_lawyer_record(record) for record in configured_records],
                "configured_cache",
                {"source": "configured_cache", "cache_path_configured": True},
            )

        return self._search_public_directory(criteria)

    def _search_public_directory(
        self,
        criteria: NovaSearchCriteria,
    ) -> Tuple[List[Dict[str, Any]], str, Dict[str, Any]]:
        criteria.nova_subject_ids = self._resolve_subject_ids(criteria)
        location_note = ""
        if criteria.postcode_or_city:
            criteria.resolved_location, location_note = self._resolve_location(criteria.postcode_or_city)
        if criteria.require_specialization_association:
            criteria.nova_specialization_ids = self._resolve_specialization_ids(criteria)

        retrieved_at = datetime.now(timezone.utc).isoformat()
        search_url = self.build_search_url(criteria)
        if not criteria.nova_subject_ids and not criteria.lawyer_name:
            details = self._source_details(
                criteria,
                retrieved_at,
                search_url,
                location_note=location_note,
                reason="No official legal-field filter could be resolved for this case.",
            )
            return [], "live_directory_unavailable", details

        max_results = normalize_max_results(criteria.max_results)
        page_size = 10
        subject_ids = criteria.nova_subject_ids or self._known_subject_ids(criteria)
        query_groups = [[subject_id] for subject_id in subject_ids] if len(subject_ids) > 1 else [subject_ids]
        target_per_query = max(page_size, math.ceil(max_results / max(len(query_groups), 1) / page_size) * page_size)
        max_pages_per_query = max(1, math.ceil(target_per_query / page_size))
        candidates: List[Dict[str, Any]] = []
        seen_profiles = set()
        fetch_urls: List[str] = []
        search_urls: List[str] = []
        page_errors: List[str] = []
        query_details: List[Dict[str, Any]] = []
        reported_total = 0
        reported_total_known = True
        pages_fetched = 0

        for query_index, query_subject_ids in enumerate(query_groups, start=1):
            query_search_url = self.build_search_url(criteria, query_subject_ids)
            search_urls.append(query_search_url)
            query_reported_total: Optional[int] = None
            query_pages = 0
            query_candidates = set()
            query_errors: List[str] = []
            for page in range(1, max_pages_per_query + 1):
                params = self._official_filter_params(criteria, subject_ids=query_subject_ids)
                params.update({"limiet": str(page_size), "pagina": str(page)})
                fetch_url = f"{self.base_url}/zoeken/fetch?{urlencode(params)}"
                fetch_urls.append(fetch_url)
                try:
                    response = requests.get(
                        fetch_url,
                        headers=self._request_headers(json_response=True),
                        timeout=self.timeout_seconds,
                    )
                    response.raise_for_status()
                    payload = response.json()
                    if not isinstance(payload, dict):
                        raise ValueError("The public directory returned an invalid response.")
                    html = payload.get("html", "") or ""
                except (requests.RequestException, ValueError) as exc:
                    message = f"Area query {query_index}, page {page}: {exc}"
                    page_errors.append(message)
                    query_errors.append(message)
                    break

                pages_fetched += 1
                query_pages += 1
                if query_reported_total is None:
                    query_reported_total = optional_int(payload.get("count"))
                page_candidates = self._parse_public_results(
                    html,
                    criteria,
                    query_search_url,
                    retrieved_at,
                    page=page,
                )
                for candidate in page_candidates:
                    profile_key = candidate.get("profile_url") or candidate.get("id")
                    if not profile_key:
                        continue
                    query_candidates.add(profile_key)
                    if profile_key not in seen_profiles:
                        seen_profiles.add(profile_key)
                        candidates.append(candidate)
                if len(query_candidates) >= target_per_query:
                    break
                if len(page_candidates) < page_size:
                    break
                if query_reported_total is not None and page * page_size >= query_reported_total:
                    break

            if query_reported_total is None:
                reported_total_known = False
            else:
                reported_total += query_reported_total
            query_details.append({
                "legal_area_ids": query_subject_ids,
                "search_url": query_search_url,
                "reported_total": query_reported_total,
                "pages_fetched": query_pages,
                "unique_candidates": len(query_candidates),
                "errors": query_errors,
            })

        if not candidates and page_errors and all(not item["pages_fetched"] for item in query_details):
            details = self._source_details(
                criteria,
                retrieved_at,
                search_urls[0] if search_urls else search_url,
                location_note=location_note,
                fetch_urls=fetch_urls,
                search_urls=search_urls,
                area_queries=query_details,
                reason="Every official legal-area query failed; no fallback records were used.",
                page_errors=page_errors,
            )
            return [], "live_directory_unavailable", details

        details = self._source_details(
            criteria,
            retrieved_at,
            search_urls[0] if search_urls else search_url,
            location_note=location_note,
            fetch_urls=fetch_urls,
            search_urls=search_urls,
            area_queries=query_details,
            reported_total=reported_total if reported_total_known else None,
            pages_fetched=pages_fetched,
            unique_candidate_count=len(candidates),
            page_errors=page_errors,
        )
        source_mode = "nova_public_directory_partial" if details["partial_results"] else "nova_public_directory"
        return candidates, source_mode, details

    def _official_filter_params(
        self,
        criteria: NovaSearchCriteria,
        subject_ids: Optional[Sequence[int]] = None,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {"type": "advocaten"}
        resolved_subject_ids = list(subject_ids) if subject_ids is not None else (
            criteria.nova_subject_ids or self._known_subject_ids(criteria)
        )
        if resolved_subject_ids:
            params["filters[rechtsgebieden]"] = json.dumps(resolved_subject_ids, separators=(",", ":"))
        if criteria.lawyer_name:
            params["q"] = criteria.lawyer_name

        location = criteria.resolved_location or {}
        if location:
            params["locatie[adres]"] = location.get("title") or criteria.postcode_or_city
            params["locatie[geo][lat]"] = location.get("lat", "")
            params["locatie[geo][lng]"] = location.get("lng", "")
            params["locatie[hash]"] = location.get("hash", "")
            params["locatie[straal]"] = str(normalize_nova_radius(criteria.radius_km))
            params["sortering"] = "afstand"

        if criteria.require_specialization_association and criteria.nova_specialization_ids:
            params["filters[specialisatieverenigingen]"] = json.dumps(
                criteria.nova_specialization_ids,
                separators=(",", ":"),
            )
        if criteria.requires_financed_legal_aid:
            params["filters[toevoegingen]"] = "1"
        return params

    def _request_headers(self, json_response: bool = False) -> Dict[str, str]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36"
            ),
            "Referer": f"{self.base_url}/zoeken",
        }
        if json_response:
            headers.update({
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
            })
        else:
            headers["Accept"] = "application/json"
        return headers

    def _resolve_location(self, query: str) -> Tuple[Dict[str, str], str]:
        try:
            response = requests.get(
                f"{self.base_url}/api/autocomplete/cities",
                params={"filter": query},
                headers=self._request_headers(),
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            return {}, f"The official location service could not resolve '{query}': {exc}"

        options = payload if isinstance(payload, list) else []
        exact = next(
            (item for item in options if str(item.get("title", "")).casefold() == str(query).strip().casefold()),
            None,
        )
        selected = exact or (options[0] if options else None)
        if not isinstance(selected, dict) or not all(selected.get(key) for key in ("title", "lat", "lng", "hash")):
            return {}, f"The official location service did not recognize '{query}'; no radius filter was applied."
        resolved = {key: str(selected[key]) for key in ("title", "lat", "lng", "hash")}
        return resolved, f"Resolved '{query}' to {resolved['title']} through the official location service."

    def _resolve_specialization_ids(self, criteria: NovaSearchCriteria) -> List[int]:
        if criteria.nova_specialization_ids:
            return dedupe_ints(criteria.nova_specialization_ids)
        if not criteria.nova_subject_ids:
            return []
        try:
            response = requests.get(
                f"{self.base_url}/api/search/specialisations",
                params={
                    "rechtsgebieden": json.dumps(criteria.nova_subject_ids, separators=(",", ":")),
                },
                headers=self._request_headers(),
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError):
            return []
        return dedupe_ints(payload if isinstance(payload, list) else [])

    def _source_details(
        self,
        criteria: NovaSearchCriteria,
        retrieved_at: str,
        search_url: str,
        *,
        location_note: str = "",
        fetch_urls: Optional[List[str]] = None,
        search_urls: Optional[List[str]] = None,
        area_queries: Optional[List[Dict[str, Any]]] = None,
        reason: str = "",
        reported_total: Optional[int] = None,
        pages_fetched: int = 0,
        unique_candidate_count: int = 0,
        page_errors: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        location_requested = bool(criteria.postcode_or_city)
        location_applied = bool(criteria.resolved_location)
        specialization_requested = bool(criteria.require_specialization_association)
        specialization_applied = specialization_requested and bool(criteria.nova_specialization_ids)
        unresolved = []
        if location_requested and not location_applied:
            unresolved.append("location")
        if specialization_requested and not specialization_applied:
            unresolved.append("specialization association")

        if location_applied:
            location_note = (
                f"Resolved '{criteria.postcode_or_city}' to {criteria.resolved_location.get('title')} and applied "
                f"the official {format_radius(normalize_nova_radius(criteria.radius_km))} radius."
            )
        elif not location_requested:
            location_note = "No location was requested; official results were not radius filtered."

        if specialization_applied:
            specialization_note = "Required official specialization associations relevant to the selected legal area."
        elif specialization_requested:
            specialization_note = "No relevant official association filter could be resolved, so it was not applied."
        elif criteria.prefer_specialization_association:
            specialization_note = "Association membership is a LARO ranking preference, not an official exclusion filter."
        else:
            specialization_note = "Association membership is not used as a filter or ranking preference."

        details = {
            "source": "NOvA public lawyer finder",
            "source_authority": "Nederlandse orde van advocaten (NOvA)",
            "source_home_url": self.base_url,
            "source_about_url": f"{self.base_url}/over-zoek-een-advocaat",
            "retrieved_at": retrieved_at,
            "freshness": "live",
            "search_url": search_url,
            "search_urls": search_urls or [search_url],
            "fetch_urls": fetch_urls or [],
            "area_queries": area_queries or [],
            "multi_area_strategy": "separate_official_queries_then_local_deduplication" if len(search_urls or []) > 1 else "single_official_query",
            "reported_total": reported_total,
            "reported_total_is_sum_across_areas": len(search_urls or []) > 1,
            "pages_fetched": pages_fetched,
            "page_size": 10,
            "unique_candidate_count": unique_candidate_count,
            "result_cap": normalize_max_results(criteria.max_results),
            "filters_requested": {
                "legal_area_ids": criteria.nova_subject_ids,
                "legal_fields": criteria.legal_fields,
                "explicit_legal_fields": criteria.explicit_legal_fields,
                "inferred_legal_fields": criteria.inferred_legal_fields,
                "lawyer_name": criteria.lawyer_name,
                "location": criteria.postcode_or_city,
                "radius_km": normalize_nova_radius(criteria.radius_km) if location_requested else None,
                "financed_legal_aid": criteria.requires_financed_legal_aid,
                "require_specialization_association": criteria.require_specialization_association,
                "prefer_specialization_association": criteria.prefer_specialization_association,
            },
            "filters_applied": {
                "legal_area": bool(criteria.nova_subject_ids),
                "lawyer_name": bool(criteria.lawyer_name),
                "location": location_applied,
                "radius": location_applied,
                "financed_legal_aid": criteria.requires_financed_legal_aid,
                "specialization_association": specialization_applied,
                "specialization_ranking_preference": (
                    criteria.prefer_specialization_association and not specialization_applied
                ),
            },
            "filters_unresolved": unresolved,
            "resolved_location": criteria.resolved_location or None,
            "official_legal_area_ids": criteria.nova_subject_ids,
            "official_specialization_ids": criteria.nova_specialization_ids,
            "case_source_coverage": criteria.case_source_coverage,
            "case_source_items_considered": sum(criteria.case_source_coverage.values()),
            "case_content_classification": "local_only",
            "raw_case_text_shared_with_directory": False,
            "location_filter_applied": location_applied,
            "location_filter_note": location_note,
            "specialization_filter_applied": specialization_applied,
            "specialization_filter_note": specialization_note,
            "ranking_method": "Official NOvA filters followed by local case-evidence ranking in LARO.",
            "source_notice": NOVA_DIRECTORY_NOTICE,
            "page_errors": page_errors or [],
            "partial_results": bool(
                page_errors
                or (reported_total is not None and unique_candidate_count < reported_total)
            ),
        }
        if reason:
            details["reason"] = reason
        return details

    def _known_subject_ids(self, criteria: NovaSearchCriteria) -> List[int]:
        return [NOVA_FIELD_IDS[field_name] for field_name in criteria.legal_fields if field_name in NOVA_FIELD_IDS]

    def _resolve_subject_ids(self, criteria: NovaSearchCriteria) -> List[int]:
        if criteria.nova_subject_ids:
            return dedupe_ints(criteria.nova_subject_ids)
        known_ids = self._known_subject_ids(criteria)
        if known_ids:
            return dedupe_ints(known_ids)

        terms = criteria.nova_subject_terms or legal_fields_to_nova_terms(criteria.legal_fields)
        for term in terms[:3]:
            try:
                response = requests.get(
                    f"{self.base_url}/api/search/rechtsgebieden",
                    params={"filter": term},
                    headers={"Accept": "application/json"},
                    timeout=self.timeout_seconds,
                )
                response.raise_for_status()
                payload = response.json()
            except (requests.RequestException, ValueError):
                continue
            items = list(payload.values()) if isinstance(payload, dict) else payload if isinstance(payload, list) else []
            main_ids = [
                item.get("id")
                for item in items
                if isinstance(item, dict) and item.get("type") == "hoofdrechtsgebied" and item.get("id")
            ]
            parent_ids = [
                (item.get("parent") or {}).get("id")
                for item in items
                if isinstance(item, dict) and isinstance(item.get("parent"), dict)
            ]
            ids = main_ids or parent_ids or [
                item.get("id") for item in items if isinstance(item, dict) and item.get("id")
            ]
            if ids:
                return dedupe_ints(ids[:3])
        return []

    def _parse_public_results(
        self,
        html: str,
        criteria: NovaSearchCriteria,
        search_url: str,
        retrieved_at: str,
        page: int = 1,
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html or "", "html.parser")
        candidates: List[Dict[str, Any]] = []
        for result in soup.select("div.result.advocaten"):
            profile = result.select_one('a[href*="/advocaten/"]')
            if not profile:
                continue
            office = result.select_one('a[href*="/kantoren/"]')
            strong_text = [node.get_text(" ", strip=True) for node in result.select(".heading strong")]
            fields = dedupe([node.get_text(" ", strip=True) for node in result.select(".jurisdictions .label")])
            associations = dedupe([
                node.get_text(" ", strip=True)
                for node in result.select(".specialisations li")
                if node.get_text(" ", strip=True).lower() != "geen"
            ])
            distance_node = result.select_one(".heading .align-right")
            distance_km = parse_distance_km(distance_node.get_text(" ", strip=True) if distance_node else "")
            profile_path = profile.get("href") or ""
            profile_url = profile_path if profile_path.startswith("http") else f"{self.base_url}{profile_path}"
            lawyer_id = profile_path.rstrip("/").split("/")[-1] or profile_url
            candidates.append(normalize_lawyer_record({
                "id": lawyer_id,
                "lawyer_id": lawyer_id,
                "name": profile.get_text(" ", strip=True),
                "firm_name": office.get_text(" ", strip=True) if office else "",
                "city": strong_text[-1].title() if strong_text else "",
                "legal_fields": fields,
                "nova_rechtsgebieden": fields,
                "specialization_associations": associations,
                "financed_legal_aid": criteria.requires_financed_legal_aid,
                "distance_km": distance_km,
                "profile_url": profile_url,
                "source_url": profile_url,
                "source_search_url": search_url,
                "source_retrieved_at": retrieved_at,
                "source_name": "NOvA public lawyer finder",
                "source_page": page,
                "is_active": True,
            }))
        return candidates

    def _load_configured_records(self) -> List[Dict[str, Any]]:
        path = os.environ.get("NOVA_DIRECTORY_CACHE")
        if not path or not os.path.exists(path):
            return []

        import json

        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, dict):
            payload = payload.get("lawyers", [])
        return payload if isinstance(payload, list) else []


class LawyerMatchingEngine:
    def __init__(self, directory_client: Optional[NovaDirectoryClient] = None):
        self.directory_client = directory_client or NovaDirectoryClient()

    def build_criteria(self, case_data: Dict[str, Any]) -> NovaSearchCriteria:
        description = " ".join(
            str(case_data.get(key, ""))
            for key in ("description", "case_description", "summary", "case_summary")
            if case_data.get(key)
        )
        explicit_legal_fields = normalize_legal_fields(
            case_data.get("legal_fields")
            or case_data.get("matched_fields")
        )
        profile = case_data.get("case_profile") if isinstance(case_data.get("case_profile"), dict) else {}
        inferred_legal_fields = normalize_legal_fields(
            profile.get("inferred_legal_fields")
            or infer_legal_fields(description, case_data.get("evidence_topics", []))
        )
        legal_fields = (
            explicit_legal_fields[:4]
            if case_data.get("manual_legal_field_override") and explicit_legal_fields
            else dedupe(explicit_legal_fields + inferred_legal_fields)[:4]
        )

        return NovaSearchCriteria(
            legal_fields=legal_fields,
            explicit_legal_fields=explicit_legal_fields,
            inferred_legal_fields=inferred_legal_fields,
            nova_subject_terms=dedupe(case_data.get("nova_subject_terms", [])),
            nova_subject_ids=dedupe_ints(case_data.get("nova_subject_ids", [])),
            nova_specialization_ids=dedupe_ints(case_data.get("nova_specialization_ids", [])),
            case_summary=str(case_data.get("summary") or case_data.get("case_summary") or ""),
            case_description=str(case_data.get("description") or case_data.get("case_description") or ""),
            postcode_or_city=str(
                case_data.get("postcode_or_city")
                or case_data.get("location")
                or case_data.get("city")
                or ""
            ),
            radius_km=normalize_nova_radius(
                case_data.get("radius_km") or case_data.get("search_radius_km") or 50
            ),
            requires_financed_legal_aid=bool(
                case_data.get("requires_financed_legal_aid")
                or case_data.get("financed_legal_aid")
                or case_data.get("toevoeging")
            ),
            prefer_specialization_association=case_data.get("prefer_specialization_association", True) is not False,
            require_specialization_association=bool(case_data.get("require_specialization_association")),
            lawyer_name=str(case_data.get("lawyer_name") or ""),
            language=str(case_data.get("language") or "nl"),
            urgency=str(case_data.get("urgency") or "normal"),
            complexity=str(case_data.get("complexity") or "medium"),
            evidence_topics=dedupe(
                dedupe(case_data.get("evidence_topics", []))
                + dedupe(case_data.get("topics", []))
            ),
            case_source_coverage=dict(profile.get("source_coverage") or case_data.get("case_source_coverage") or {}),
            max_results=normalize_max_results(case_data.get("max_results") or 30),
        )

    def match(
        self,
        case_data: Dict[str, Any],
        records: Optional[Sequence[Dict[str, Any]]] = None,
        max_results: Optional[int] = None,
    ) -> Dict[str, Any]:
        criteria = self.build_criteria(case_data or {})
        if max_results:
            criteria.max_results = int(max_results)

        candidates, source_mode, source_details = self.directory_client.search(criteria, records=records)
        search_url = self.directory_client.build_search_url(criteria)
        ranked = []
        for candidate in candidates:
            scored = self._score_candidate(candidate, criteria)
            if scored:
                ranked.append(scored)

        ranked.sort(key=lambda lawyer: lawyer["match_score"], reverse=True)
        return {
            "matched_lawyers": ranked[: criteria.max_results],
            "search_criteria": criteria_to_dict(criteria),
            "case_profile": {
                "inferred_legal_fields": criteria.inferred_legal_fields,
                "explicit_legal_fields": criteria.explicit_legal_fields,
                "selected_legal_fields": criteria.legal_fields,
                "manual_legal_field_override": bool(case_data.get("manual_legal_field_override")),
                "evidence_topics": criteria.evidence_topics,
                "source_coverage": criteria.case_source_coverage,
                "raw_case_text_shared_with_directory": False,
            },
            "source_mode": source_mode,
            "source_details": source_details,
            "nova_search_url": search_url,
            "result_count": len(ranked[: criteria.max_results]),
            "available_count": len(candidates),
        }

    def _score_candidate(self, lawyer: Dict[str, Any], criteria: NovaSearchCriteria) -> Optional[Dict[str, Any]]:
        if not lawyer.get("is_active", True):
            return None

        distance = lawyer.get("distance_km")
        national_search = criteria.radius_km >= 56
        if distance is not None and not national_search and criteria.radius_km and distance > criteria.radius_km:
            return None

        if criteria.requires_financed_legal_aid and not lawyer.get("financed_legal_aid"):
            return None

        candidate_fields = normalize_legal_fields(lawyer.get("legal_fields", []))
        subject_terms = set(term.lower() for term in criteria.nova_subject_terms or legal_fields_to_nova_terms(criteria.legal_fields))
        candidate_terms = set(term.lower() for term in lawyer.get("nova_rechtsgebieden", []))
        field_overlap = set(criteria.legal_fields) & set(candidate_fields)
        term_overlap = subject_terms & candidate_terms
        if criteria.legal_fields and not field_overlap and not term_overlap:
            return None

        legal_score = 45.0 if field_overlap else 25.0 if term_overlap else 0.0
        text_blob = " ".join(
            [
                criteria.case_summary,
                criteria.case_description,
                " ".join(criteria.evidence_topics),
            ]
        ).lower()
        lawyer_blob = " ".join(
            lawyer.get("nova_rechtsgebieden", [])
            + lawyer.get("legal_fields", [])
            + lawyer.get("specialization_associations", [])
        ).lower()
        topic_hits = [term for term in subject_terms if term and term in text_blob and term in lawyer_blob]
        keyword_score = min(15.0, len(topic_hits) * 5.0)

        if distance is None:
            location_score = 0.0
        else:
            scoring_radius = 50 if national_search else criteria.radius_km
            location_score = max(0.0, 15.0 * (1 - min(distance, scoring_radius) / max(scoring_radius, 1)))

        specialization_score = 10.0 if lawyer.get("specialization_associations") else 0.0
        if not criteria.prefer_specialization_association and not criteria.require_specialization_association:
            specialization_score *= 0.5

        legal_aid_score = 8.0 if lawyer.get("financed_legal_aid") else 0.0
        response_rate = lawyer.get("response_rate")
        acceptance_rate = lawyer.get("acceptance_rate")
        response_score = 0.0
        if isinstance(response_rate, (int, float)) or isinstance(acceptance_rate, (int, float)):
            response_score = min(7.0, (float(response_rate or 0) * 4.0) + (float(acceptance_rate or 0) * 30.0))
        total_score = round(legal_score + keyword_score + location_score + specialization_score + legal_aid_score + response_score, 2)

        enriched = dict(lawyer)
        enriched.update(
            {
                "id": str(lawyer.get("id") or lawyer.get("lawyer_id")),
                "match_score": total_score,
                "relevance_score": round(total_score / 100, 3),
                "score_breakdown": {
                    "legal_area": round(legal_score, 2),
                    "case_terms": round(keyword_score, 2),
                    "location": round(location_score, 2),
                    "specialization": round(specialization_score, 2),
                    "financed_legal_aid": round(legal_aid_score, 2),
                    "responsiveness": round(response_score, 2),
                },
                "match_reasons": build_match_reasons(
                    lawyer,
                    field_overlap,
                    term_overlap,
                    topic_hits,
                    criteria,
                ),
                "filter_hits": {
                    "legal_fields": sorted(field_overlap),
                    "nova_terms": sorted(term_overlap),
                    "within_radius": (national_search or distance <= criteria.radius_km) if distance is not None else None,
                    "financed_legal_aid": bool(lawyer.get("financed_legal_aid")),
                    "specialization_association": bool(lawyer.get("specialization_associations")),
                },
                "nova_search_url": self.directory_client.build_search_url(criteria),
            }
        )
        return enriched


def build_match_reasons(
    lawyer: Dict[str, Any],
    field_overlap: Iterable[str],
    term_overlap: Iterable[str],
    topic_hits: Iterable[str],
    criteria: NovaSearchCriteria,
) -> List[str]:
    reasons = []
    if field_overlap:
        reasons.append(f"Matches legal field: {', '.join(sorted(field_overlap))}")
    if term_overlap:
        reasons.append(f"Matches NOvA subject filter: {', '.join(sorted(term_overlap))}")
    if topic_hits:
        reasons.append(f"Matches case evidence terms: {', '.join(sorted(set(topic_hits)))}")
    if lawyer.get("distance_km") is not None:
        reasons.append(f"{lawyer['distance_km']} km from {criteria.postcode_or_city or 'case location'}")
    if lawyer.get("financed_legal_aid"):
        reasons.append("Accepts financed legal aid/toevoeging")
    if lawyer.get("specialization_associations"):
        reasons.append("Member of a specialization association")
    return reasons or ["General practice candidate for manual review"]


def criteria_to_dict(criteria: NovaSearchCriteria) -> Dict[str, Any]:
    return {
        "legal_fields": criteria.legal_fields,
        "explicit_legal_fields": criteria.explicit_legal_fields,
        "inferred_legal_fields": criteria.inferred_legal_fields,
        "nova_subject_terms": criteria.nova_subject_terms or legal_fields_to_nova_terms(criteria.legal_fields),
        "nova_subject_ids": criteria.nova_subject_ids,
        "nova_specialization_ids": criteria.nova_specialization_ids,
        "postcode_or_city": criteria.postcode_or_city,
        "radius_km": criteria.radius_km,
        "requires_financed_legal_aid": criteria.requires_financed_legal_aid,
        "prefer_specialization_association": criteria.prefer_specialization_association,
        "require_specialization_association": criteria.require_specialization_association,
        "lawyer_name": criteria.lawyer_name,
        "language": criteria.language,
        "urgency": criteria.urgency,
        "complexity": criteria.complexity,
        "evidence_topics": criteria.evidence_topics,
        "case_source_coverage": criteria.case_source_coverage,
        "max_results": criteria.max_results,
        "resolved_location": criteria.resolved_location or None,
    }


def legal_fields_to_nova_terms(legal_fields: Sequence[str]) -> List[str]:
    return dedupe(legal_field_terms(legal_fields))


def infer_legal_fields(text: str, evidence_topics: Sequence[str]) -> List[str]:
    return infer_dutch_legal_fields(text, evidence_topics, limit=4) or ["GENERAL_LAW"]


def normalize_legal_fields(values: Any) -> List[str]:
    return normalize_dutch_legal_fields(values)


def normalize_lawyer_record(record: Dict[str, Any]) -> Dict[str, Any]:
    name = record.get("name") or " ".join(
        part for part in [record.get("first_name"), record.get("last_name")] if part
    )
    first_name, last_name = split_name(name)
    lawyer_id = record.get("lawyer_id") or record.get("id") or record.get("nova_id")
    legal_fields = normalize_legal_fields(
        record.get("legal_fields")
        or record.get("specializations")
        or [record.get("specialization")]
    )
    return {
        **record,
        "id": str(record.get("id") or lawyer_id),
        "lawyer_id": lawyer_id,
        "nova_id": record.get("nova_id") or str(lawyer_id or ""),
        "name": name,
        "first_name": record.get("first_name") or first_name,
        "last_name": record.get("last_name") or last_name,
        "email": record.get("email") or "",
        "phone": record.get("phone") or "",
        "firm_name": record.get("firm_name") or record.get("firm") or "",
        "city": record.get("city") or "",
        "postcode": record.get("postcode") or "",
        "distance_km": record.get("distance_km"),
        "legal_fields": legal_fields,
        "nova_rechtsgebieden": dedupe(record.get("nova_rechtsgebieden", []) or legal_fields_to_nova_terms(legal_fields)),
        "specialization_associations": dedupe(record.get("specialization_associations", [])),
        "financed_legal_aid": bool(record.get("financed_legal_aid") or record.get("toevoegingen")),
        "languages": dedupe(record.get("languages", [])),
        "profile_url": record.get("profile_url") or "",
        "is_active": record.get("is_active", True),
        "response_rate": _optional_rate(record.get("response_rate")),
        "acceptance_rate": _optional_rate(record.get("acceptance_rate")),
    }


def split_name(name: str) -> Tuple[str, str]:
    parts = str(name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def dedupe(values: Any) -> List[str]:
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    seen = set()
    result = []
    for value in values:
        text = str(value).strip()
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            result.append(text)
    return result


def dedupe_ints(values: Iterable[Any]) -> List[int]:
    if not values:
        return []
    if isinstance(values, (str, int, float)):
        values = [values]
    result: List[int] = []
    for value in values:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed not in result:
            result.append(parsed)
    return result


def normalize_nova_radius(value: Any) -> int:
    try:
        radius = int(value)
    except (TypeError, ValueError):
        radius = 50
    if radius >= 56:
        return 56
    return max(5, min(radius, 50))


def format_radius(radius: int) -> str:
    return "national" if int(radius) >= 56 else f"{int(radius)} km"


def normalize_max_results(value: Any) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        limit = 30
    return max(1, min(limit, 100))


def optional_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_distance_km(value: Any) -> Optional[float]:
    match = re.search(r"([0-9]+(?:[.,][0-9]+)?)\s*km", str(value or ""), flags=re.IGNORECASE)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", "."))
    except ValueError:
        return None


def _optional_rate(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
