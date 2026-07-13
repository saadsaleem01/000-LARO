"""Approval-gated, in-memory case bundle export for LARO."""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import unicodedata
import zipfile
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


DEFAULT_MAX_BUNDLE_BYTES = 100 * 1024 * 1024
_INTERNAL_KEYS = {
    "local_path",
    "access_token",
    "refresh_token",
    "id_token",
    "client_secret",
    "password",
}
_SENSITIVE_KEY_SUFFIXES = ("_token", "_secret", "_password", "_api_key", "_authorization_code")
_SENSITIVE_QUERY_MARKERS = ("token", "signature", "secret", "credential", "api_key", "authorization_code")


class CaseBundleExportError(RuntimeError):
    """Raised when a bundle cannot be exported without crossing a safety gate."""


class CaseBundleExporter:
    def __init__(
        self,
        *,
        safe_file_resolver: Callable[[Any], Optional[str]],
        max_uncompressed_bytes: int = DEFAULT_MAX_BUNDLE_BYTES,
    ):
        self.safe_file_resolver = safe_file_resolver
        self.max_uncompressed_bytes = max(1024 * 1024, int(max_uncompressed_bytes))

    def build(
        self,
        bundle: Dict[str, Any],
        documents: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        approval = bundle.get("external_sharing_approval") or {}
        snapshot_hash = str(bundle.get("bundle_snapshot_hash") or "")
        approval_snapshot = str((approval.get("context") or {}).get("bundle_snapshot_hash") or "")
        if not bundle.get("external_sharing_allowed") or approval.get("status") != "approved":
            raise CaseBundleExportError("An approved, current case-bundle sharing approval is required")
        if not snapshot_hash or approval_snapshot != snapshot_hash:
            raise CaseBundleExportError("The bundle approval does not match the current case snapshot")

        generated_at = datetime.now(timezone.utc).isoformat()
        archive_buffer = io.BytesIO()
        entry_manifest: List[Dict[str, Any]] = []
        omitted_entries: List[Dict[str, Any]] = []
        uncompressed_bytes = 0

        def add_entry(
            archive: zipfile.ZipFile,
            name: str,
            value: Any,
            *,
            entry_type: str,
            required: bool = False,
        ) -> bool:
            nonlocal uncompressed_bytes
            data = value if isinstance(value, bytes) else str(value).encode("utf-8")
            if uncompressed_bytes + len(data) > self.max_uncompressed_bytes:
                if required:
                    raise CaseBundleExportError(
                        f"Required bundle metadata exceeds the {self.max_uncompressed_bytes}-byte export limit"
                    )
                omitted_entries.append({
                    "name": name,
                    "reason": "bundle_size_limit",
                    "size_bytes": len(data),
                })
                return False
            archive.writestr(name, data)
            uncompressed_bytes += len(data)
            entry_manifest.append({
                "name": name,
                "entry_type": entry_type,
                "size_bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            })
            return True

        def add_json(archive: zipfile.ZipFile, name: str, value: Any, *, required: bool = True) -> bool:
            return add_entry(
                archive,
                name,
                json.dumps(_strip_internal_values(value), ensure_ascii=False, sort_keys=True, indent=2),
                entry_type="structured_json",
                required=required,
            )

        document_index: List[Dict[str, Any]] = []
        with zipfile.ZipFile(archive_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            add_entry(
                archive,
                "README.txt",
                (
                    "LARO legal case bundle\n"
                    "======================\n\n"
                    "This archive was generated locally from a human-approved case snapshot.\n"
                    "It organizes evidence and drafts; it is not legal advice or a court filing.\n"
                    "Review every source and statement before external use.\n\n"
                    f"Case ID: {bundle.get('case_id')}\n"
                    f"Generated: {generated_at}\n"
                    f"Approval ID: {approval.get('id')}\n"
                    f"Snapshot: {snapshot_hash}\n"
                ),
                entry_type="readme",
                required=True,
            )

            summary = bundle.get("summary") or {}
            add_json(archive, "case.json", (summary.get("case") or {}))
            add_json(archive, "timeline.json", bundle.get("source_linked_timeline") or bundle.get("timeline") or [])
            add_json(archive, "claims.json", bundle.get("claims") or {})
            add_json(archive, "review-items.json", bundle.get("review_items") or {})
            add_json(archive, "next-actions.json", bundle.get("next_actions") or [])
            add_json(archive, "outreach.json", {
                "attempts": bundle.get("outreach") or [],
                "responses": bundle.get("lawyer_responses") or [],
            })
            add_json(archive, "drafts.json", bundle.get("drafts") or [])
            add_json(archive, "approvals.json", bundle.get("approvals") or [])
            add_json(archive, "audit-log.json", bundle.get("audit_events") or [])
            add_entry(
                archive,
                "red-line.txt",
                ((bundle.get("red_line") or {}).get("body") or ""),
                entry_type="red_line",
                required=True,
            )

            for document in documents or []:
                document_id = int(document.get("document_id") or document.get("id") or 0)
                base_name = _safe_filename(
                    document.get("original_filename") or document.get("title") or f"document-{document_id}"
                )
                base_stem, base_extension = os.path.splitext(base_name)
                base_stem = base_stem or f"document-{document_id}"
                included_entries: List[str] = []

                safe_path = self.safe_file_resolver(document.get("local_path"))
                if safe_path:
                    source_extension = base_extension or os.path.splitext(safe_path)[1]
                    source_name = f"documents/{document_id:04d}_{base_stem[:90]}{source_extension}"
                    source_size = os.path.getsize(safe_path)
                    if uncompressed_bytes + source_size <= self.max_uncompressed_bytes:
                        with open(safe_path, "rb") as handle:
                            source_data = handle.read()
                        if add_entry(archive, source_name, source_data, entry_type="source_document"):
                            included_entries.append(source_name)
                    else:
                        omitted_entries.append({
                            "name": source_name,
                            "reason": "bundle_size_limit",
                            "size_bytes": source_size,
                        })

                extracted_text = str(document.get("extracted_text") or document.get("ocr_text") or "").strip()
                if extracted_text:
                    text_name = f"documents/{document_id:04d}_{base_stem[:90]}_extracted.txt"
                    if add_entry(archive, text_name, extracted_text, entry_type="extracted_text"):
                        included_entries.append(text_name)

                document_index.append({
                    "document_id": document_id,
                    "title": document.get("title") or document.get("original_filename") or base_name,
                    "original_filename": document.get("original_filename") or "",
                    "source_type": document.get("source_type") or "",
                    "source_uri": document.get("source_uri") or "",
                    "content_hash": document.get("content_hash") or "",
                    "document_type": document.get("document_type") or "unknown",
                    "date_on_document": document.get("date_on_document") or "",
                    "sender": document.get("sender") or "",
                    "recipient": document.get("recipient") or "",
                    "summary": document.get("summary") or "",
                    "relevance_score": document.get("relevance_score") or 0,
                    "confidentiality_level": document.get("confidentiality_level") or "normal",
                    "included_entries": included_entries,
                })

            add_json(archive, "documents/index.json", document_index)
            manifest = {
                "format": "laro-case-bundle-v1",
                "case_id": bundle.get("case_id"),
                "generated_at": generated_at,
                "approval_id": approval.get("id"),
                "bundle_snapshot_hash": snapshot_hash,
                "snapshot_counts": bundle.get("snapshot_counts") or {},
                "entries": list(entry_manifest),
                "omitted_entries": list(omitted_entries),
                "external_action_taken": False,
                "legal_safety": {
                    "not_legal_advice": True,
                    "requires_human_review": True,
                    "approval_bound_to_snapshot": True,
                },
            }
            add_json(archive, "manifest.json", manifest)

        archive_bytes = archive_buffer.getvalue()
        case_title = ((bundle.get("summary") or {}).get("case") or {}).get("title") or f"case-{bundle.get('case_id')}"
        return {
            "archive_bytes": archive_bytes,
            "archive_sha256": hashlib.sha256(archive_bytes).hexdigest(),
            "download_name": f"LARO_case_{bundle.get('case_id')}_{_safe_filename(case_title)[:80]}.zip",
            "manifest": manifest,
            "archive_size_bytes": len(archive_bytes),
            "uncompressed_size_bytes": uncompressed_bytes,
        }


def _safe_filename(value: Any) -> str:
    folded = unicodedata.normalize("NFKD", str(value or "document"))
    ascii_value = "".join(character for character in folded if not unicodedata.combining(character))
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_value).strip("-._")
    return cleaned[:140] or "document"


def _strip_internal_values(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            normalized_key = str(key).casefold()
            if normalized_key in _INTERNAL_KEYS or normalized_key.endswith(_SENSITIVE_KEY_SUFFIXES):
                continue
            cleaned[key] = (
                _sanitize_source_uri(item)
                if normalized_key in {"source_uri", "source_url"}
                else _strip_internal_values(item)
            )
        return cleaned
    if isinstance(value, list):
        return [_strip_internal_values(item) for item in value]
    if isinstance(value, tuple):
        return [_strip_internal_values(item) for item in value]
    return value


def _sanitize_source_uri(value: Any) -> str:
    text = str(value or "")
    try:
        parsed = urlsplit(text)
        if not parsed.query:
            return text
        safe_query = [
            (key, item)
            for key, item in parse_qsl(parsed.query, keep_blank_values=True)
            if not any(marker in key.casefold() for marker in _SENSITIVE_QUERY_MARKERS)
        ]
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(safe_query), parsed.fragment))
    except (TypeError, ValueError):
        return text
