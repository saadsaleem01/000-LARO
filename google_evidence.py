"""Read-only Gmail and Google Drive evidence retrieval for LARO."""

from __future__ import annotations

import base64
import datetime as dt
import os
import tempfile
from typing import Any, Dict, Iterable, List, Optional, Tuple

from document_intelligence import DocumentIntelligenceEngine


class GoogleEvidenceError(RuntimeError):
    """Raised for recoverable Google credential or read-only retrieval failures."""


class GoogleEvidenceConnector:
    """Fetch only explicitly queried Gmail or Drive material for a case import."""

    def __init__(
        self,
        token_response: Dict[str, Any],
        *,
        client_id: str,
        client_secret: str,
        scopes: Iterable[str],
        gmail_service=None,
        drive_service=None,
        max_download_bytes: int = 10 * 1024 * 1024,
    ):
        self.token_response = dict(token_response or {})
        self.client_id = client_id
        self.client_secret = client_secret
        self.scopes = list(scopes or [])
        self.gmail_service = gmail_service
        self.drive_service = drive_service
        self.max_download_bytes = max(1024, int(max_download_bytes))
        self.intelligence = DocumentIntelligenceEngine()
        self._credentials = None
        self._credentials_refreshed = False

    def fetch(
        self,
        source: str,
        query: str,
        max_items: int = 50,
        *,
        days_back: Optional[int] = None,
        sort_order: str = "newest",
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        raw_source = str(source or "").strip().lower()
        normalized_source = {"drive": "google_drive", "gdrive": "google_drive"}.get(raw_source, raw_source)
        if normalized_source not in {"gmail", "google_drive", "all"}:
            raise GoogleEvidenceError("source must be gmail, google_drive, or all")
        if not str(query or "").strip():
            raise GoogleEvidenceError("A Gmail search or Google Drive query is required")
        limit = max(1, min(int(max_items or 50), 100))
        normalized_days_back = self._normalize_days_back(days_back)
        normalized_sort_order = self._normalize_sort_order(sort_order)
        records: List[Dict[str, Any]] = []
        if normalized_source in {"gmail", "all"}:
            records.extend(self.fetch_gmail(query, limit, days_back=normalized_days_back))
        if normalized_source in {"google_drive", "all"}:
            records.extend(
                self.fetch_drive(
                    query,
                    limit,
                    days_back=normalized_days_back,
                    sort_order=normalized_sort_order,
                )
            )
        return records, self.refreshed_token_response()

    def fetch_gmail(self, query: str, max_items: int, *, days_back: Optional[int] = None) -> List[Dict[str, Any]]:
        service = self._gmail()
        listing = service.users().messages().list(
            userId="me",
            q=self._gmail_query(query, days_back),
            maxResults=max_items,
        ).execute() or {}
        records = []
        for item in (listing.get("messages") or [])[:max_items]:
            message_id = item.get("id")
            if not message_id:
                continue
            message = service.users().messages().get(userId="me", id=message_id, format="full").execute() or {}
            headers = {str(header.get("name") or "").lower(): header.get("value") or "" for header in message.get("payload", {}).get("headers", [])}
            body = self._gmail_body(message.get("payload") or {}) or message.get("snippet") or ""
            records.append({
                "id": message_id,
                "message_id": message_id,
                "source_type": "gmail",
                "source_uri": f"https://mail.google.com/mail/u/0/#all/{message_id}",
                "title": headers.get("subject") or "Gmail message",
                "document_type": "email",
                "date": headers.get("date") or "",
                "sender": headers.get("from") or "",
                "recipient": headers.get("to") or "",
                "plain_text": body,
                "labels": message.get("labelIds") or [],
                "metadata": {"thread_id": message.get("threadId"), "gmail_message_id": message_id},
            })
            records.extend(self._gmail_attachment_records(service, message, headers))
        return records

    def _gmail_attachment_records(self, service, message: Dict[str, Any], headers: Dict[str, str]) -> List[Dict[str, Any]]:
        """Map a Gmail message's attachments to independently reviewable evidence."""
        message_id = str(message.get("id") or "")
        if not message_id:
            return []
        records = []
        for part in self._gmail_attachment_parts(message.get("payload") or {}):
            filename = str(part.get("filename") or "attachment")
            mime_type = str(part.get("mimeType") or "application/octet-stream")
            body = part.get("body") or {}
            attachment_id = str(body.get("attachmentId") or "")
            size = self._as_nonnegative_int(body.get("size"))
            content = ""
            extraction_note = "Attachment metadata imported; no attachment content was returned by Gmail"

            if size and size > self.max_download_bytes:
                extraction_note = f"Skipped attachment content larger than {self.max_download_bytes} bytes"
            else:
                try:
                    encoded = body.get("data")
                    if not encoded and attachment_id:
                        payload = service.users().messages().attachments().get(
                            userId="me", messageId=message_id, id=attachment_id
                        ).execute() or {}
                        encoded = payload.get("data")
                    if encoded:
                        content = self._extract_attachment_text(
                            self._decode_base64_bytes(encoded), filename, mime_type
                        )
                        extraction_note = (
                            "Attachment text extracted locally"
                            if content
                            else "Attachment imported, but no readable text could be extracted"
                        )
                except Exception as exc:
                    extraction_note = f"Attachment content could not be extracted: {exc.__class__.__name__}"

            stable_id = attachment_id or f"inline-{len(records) + 1}"
            records.append({
                "id": f"{message_id}:{stable_id}",
                "message_id": message_id,
                "attachment_id": stable_id,
                "source_type": "gmail_attachment",
                "source_uri": f"https://mail.google.com/mail/u/0/#all/{message_id}?attachment={stable_id}",
                "title": f"{headers.get('subject') or 'Gmail attachment'} - {filename}",
                "original_filename": filename,
                "document_type": mime_type,
                "mime_type": mime_type,
                "date": headers.get("date") or "",
                "sender": headers.get("from") or "",
                "recipient": headers.get("to") or "",
                "content": content,
                "metadata": {
                    "gmail_message_id": message_id,
                    "gmail_attachment_id": stable_id,
                    "parent_subject": headers.get("subject") or "",
                    "size_bytes": size,
                    "mime_type": mime_type,
                    "extraction_note": extraction_note,
                },
            })
        return records

    def fetch_drive(
        self,
        query: str,
        max_items: int,
        *,
        days_back: Optional[int] = None,
        sort_order: str = "newest",
    ) -> List[Dict[str, Any]]:
        service = self._drive()
        drive_query = self._drive_query(query, days_back=days_back)
        listing = service.files().list(
            q=drive_query,
            pageSize=max_items,
            fields="files(id,name,mimeType,description,createdTime,modifiedTime,webViewLink,owners(displayName,emailAddress),size,md5Checksum)",
            orderBy="modifiedTime asc" if self._normalize_sort_order(sort_order) == "oldest" else "modifiedTime desc",
        ).execute() or {}
        records = []
        for item in (listing.get("files") or [])[:max_items]:
            file_id = item.get("id")
            if not file_id:
                continue
            content, extraction_note = self._drive_text(service, item)
            owners = item.get("owners") or []
            owner = ", ".join(owner.get("emailAddress") or owner.get("displayName") or "" for owner in owners if owner)
            records.append({
                "id": file_id,
                "file_id": file_id,
                "source_type": "google_drive",
                "source_uri": item.get("webViewLink") or f"https://drive.google.com/open?id={file_id}",
                "title": item.get("name") or "Google Drive file",
                "original_filename": item.get("name") or "Google Drive file",
                "document_type": item.get("mimeType") or "google_drive_file",
                "mime_type": item.get("mimeType") or "",
                "date": item.get("modifiedTime") or item.get("createdTime") or "",
                "sender": owner,
                "content": content,
                "metadata": {
                    "drive_file_id": file_id,
                    "mime_type": item.get("mimeType"),
                    "md5_checksum": item.get("md5Checksum"),
                    "size_bytes": item.get("size"),
                    "extraction_note": extraction_note,
                },
            })
        return records

    def refreshed_token_response(self) -> Optional[Dict[str, Any]]:
        if not self._credentials_refreshed or not self._credentials:
            return None
        expiry = self._credentials.expiry.isoformat() if self._credentials.expiry else None
        return {
            "access_token": self._credentials.token,
            "refresh_token": self._credentials.refresh_token,
            "token_type": "Bearer",
            "scope": " ".join(self.scopes),
            "expiry": expiry,
            "token_uri": self._credentials.token_uri,
        }

    def _credentials_for_request(self):
        if self._credentials is not None:
            return self._credentials
        try:
            from google.auth.transport.requests import Request
            from google.oauth2.credentials import Credentials
        except ImportError as exc:
            raise GoogleEvidenceError("Google API dependencies are not installed. Run python -m pip install -r requirements.txt") from exc
        expiry = self._parse_expiry(self.token_response.get("expiry"), self.token_response.get("expires_in"))
        self._credentials = Credentials(
            token=self.token_response.get("access_token"),
            refresh_token=self.token_response.get("refresh_token"),
            token_uri=self.token_response.get("token_uri") or "https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.scopes,
            expiry=expiry,
        )
        if not self._credentials.token:
            raise GoogleEvidenceError("No usable Google access token is stored locally")
        if self._credentials.expired:
            if not self._credentials.refresh_token:
                raise GoogleEvidenceError("Google access expired. Reconnect Google to continue importing evidence")
            try:
                self._credentials.refresh(Request())
                self._credentials_refreshed = True
            except Exception as exc:
                raise GoogleEvidenceError("Google credentials could not be refreshed. Reconnect Google to continue") from exc
        return self._credentials

    def _gmail(self):
        if self.gmail_service is not None:
            return self.gmail_service
        try:
            from googleapiclient.discovery import build
            self.gmail_service = build("gmail", "v1", credentials=self._credentials_for_request(), cache_discovery=False)
            return self.gmail_service
        except GoogleEvidenceError:
            raise
        except Exception as exc:
            raise GoogleEvidenceError("Gmail could not be opened with the stored read-only credentials") from exc

    def _drive(self):
        if self.drive_service is not None:
            return self.drive_service
        try:
            from googleapiclient.discovery import build
            self.drive_service = build("drive", "v3", credentials=self._credentials_for_request(), cache_discovery=False)
            return self.drive_service
        except GoogleEvidenceError:
            raise
        except Exception as exc:
            raise GoogleEvidenceError("Google Drive could not be opened with the stored read-only credentials") from exc

    @staticmethod
    def _gmail_body(payload: Dict[str, Any]) -> str:
        mime_type = str(payload.get("mimeType") or "")
        body = payload.get("body") or {}
        data = body.get("data")
        if data and mime_type == "text/plain":
            return GoogleEvidenceConnector._decode_base64(data)
        for part in payload.get("parts") or []:
            text = GoogleEvidenceConnector._gmail_body(part)
            if text:
                return text
        if data and mime_type == "text/html":
            return DocumentIntelligenceEngine().extract_text_from_document({"html": GoogleEvidenceConnector._decode_base64(data)})
        return ""

    @staticmethod
    def _gmail_attachment_parts(payload: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
        for part in payload.get("parts") or []:
            if part.get("filename") and (part.get("body") or {}).get("attachmentId"):
                yield part
            yield from GoogleEvidenceConnector._gmail_attachment_parts(part)

    def _extract_attachment_text(self, raw: bytes, filename: str, mime_type: str) -> str:
        suffix = os.path.splitext(filename)[1].lower() or {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "text/html": ".html",
            "text/plain": ".txt",
        }.get(mime_type, ".bin")
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            path = handle.name
            handle.write(raw)
        try:
            return self.intelligence.extract_text_from_file(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    def _drive_text(self, service, item: Dict[str, Any]) -> Tuple[str, str]:
        mime_type = str(item.get("mimeType") or "")
        file_id = item.get("id")
        size = int(item.get("size") or 0) if str(item.get("size") or "").isdigit() else 0
        if size and size > self.max_download_bytes:
            return "", f"Skipped file content larger than {self.max_download_bytes} bytes"
        try:
            if mime_type == "application/vnd.google-apps.document":
                raw = service.files().export_media(fileId=file_id, mimeType="text/plain").execute()
                return self._decode_bytes(raw), "Exported Google Doc as text"
            if mime_type.startswith("text/") or mime_type in {"application/json", "application/xml"}:
                raw = service.files().get_media(fileId=file_id).execute()
                return self._decode_bytes(raw), "Downloaded text content"
            if mime_type in {
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }:
                raw = service.files().get_media(fileId=file_id).execute()
                return self._extract_downloaded_file(raw, mime_type), "Downloaded temporarily and extracted locally"
        except Exception as exc:
            return "", f"Content could not be extracted: {exc.__class__.__name__}"
        return item.get("description") or "", "Metadata-only import for this Google Drive file type"

    def _extract_downloaded_file(self, raw: Any, mime_type: str) -> str:
        suffix = ".pdf" if mime_type == "application/pdf" else ".docx"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            path = handle.name
            handle.write(raw if isinstance(raw, bytes) else bytes(raw))
        try:
            return self.intelligence.extract_text_from_file(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    @staticmethod
    def _decode_base64(value: str) -> str:
        return GoogleEvidenceConnector._decode_bytes(GoogleEvidenceConnector._decode_base64_bytes(value))

    @staticmethod
    def _decode_base64_bytes(value: Any) -> bytes:
        encoded = str(value or "")
        padding = "=" * (-len(encoded) % 4)
        return base64.urlsafe_b64decode(encoded + padding)

    @staticmethod
    def _as_nonnegative_int(value: Any) -> int:
        try:
            return max(0, int(value or 0))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _decode_bytes(value: Any) -> str:
        if isinstance(value, str):
            return value
        raw = bytes(value or b"")
        for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
            try:
                return raw.decode(encoding)
            except UnicodeDecodeError:
                continue
        return ""

    @staticmethod
    def _parse_expiry(value: Any, expires_in: Any) -> Optional[dt.datetime]:
        if value:
            try:
                return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except ValueError:
                pass
        if expires_in:
            try:
                return dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=int(expires_in))
            except (TypeError, ValueError):
                pass
        return None

    @staticmethod
    def _normalize_days_back(value: Any) -> Optional[int]:
        if value in {None, ""}:
            return None
        try:
            return max(1, min(3650, int(value)))
        except (TypeError, ValueError) as exc:
            raise GoogleEvidenceError("days_back must be a number between 1 and 3650") from exc

    @staticmethod
    def _normalize_sort_order(value: Any) -> str:
        normalized = str(value or "newest").strip().lower()
        if normalized not in {"newest", "oldest"}:
            raise GoogleEvidenceError("sort_order must be newest or oldest")
        return normalized

    @classmethod
    def _gmail_query(cls, query: str, days_back: Optional[int]) -> str:
        if not days_back:
            return query
        normalized = str(query or "").strip()
        lowered = normalized.lower()
        if any(operator in lowered for operator in ("after:", "before:", "newer_than:", "older_than:")):
            return normalized
        return f"({normalized}) newer_than:{days_back}d"

    @classmethod
    def _drive_query(cls, query: str, days_back: Optional[int] = None) -> str:
        query = str(query or "").strip()
        if not query:
            raise GoogleEvidenceError("A Google Drive query is required")
        if any(operator in query.lower() for operator in (" contains ", " = ", " in ", " and ", " or ")):
            result = f"({query}) and trashed = false"
        else:
            escaped = query.replace("'", "\\'")
            result = f"fullText contains '{escaped}' and trashed = false"
        if days_back:
            cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days_back)).replace(microsecond=0)
            result = f"{result} and modifiedTime >= '{cutoff.isoformat().replace('+00:00', 'Z')}'"
        return result
