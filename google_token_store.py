"""Encrypted, local-only storage for OAuth credentials.

The legal ledger records connection state and an irreversible token fingerprint.
Raw OAuth credentials stay outside the database in this encrypted local vault.
"""

from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:  # pragma: no cover - exercised through a clear runtime error
    Fernet = None
    InvalidToken = Exception


class TokenStoreError(RuntimeError):
    """Raised when local OAuth credentials cannot be stored or decrypted safely."""


class LocalEncryptedTokenStore:
    """A small encrypted file vault for one user's provider credentials."""

    def __init__(self, root: Optional[str] = None, encryption_key: Optional[str] = None):
        self.root = Path(root or os.environ.get("LARO_TOKEN_STORE_DIR") or "tokens").expanduser().resolve()
        self._configured_key = encryption_key or os.environ.get("LARO_TOKEN_ENCRYPTION_KEY")

    def save(self, external_user_id: Any, provider: str, token_response: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(token_response, dict) or not token_response.get("access_token"):
            raise TokenStoreError("OAuth token response does not contain an access token")
        payload = self._normalized_payload(provider, token_response)
        path = self._record_path(external_user_id, provider)
        path.parent.mkdir(parents=True, exist_ok=True)
        encrypted = self._fernet().encrypt(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        self._atomic_write(path, encrypted)
        return self.status(external_user_id, provider)

    def load(self, external_user_id: Any, provider: str) -> Optional[Dict[str, Any]]:
        path = self._record_path(external_user_id, provider)
        if not path.is_file():
            return None
        try:
            payload = json.loads(self._fernet().decrypt(path.read_bytes()).decode("utf-8"))
        except (OSError, ValueError, InvalidToken) as exc:
            raise TokenStoreError("Local OAuth credentials could not be decrypted") from exc
        if payload.get("provider") != self._normalized_provider(provider):
            raise TokenStoreError("Stored OAuth provider does not match the requested provider")
        return dict(payload.get("tokens") or {})

    def status(self, external_user_id: Any, provider: str) -> Dict[str, Any]:
        path = self._record_path(external_user_id, provider)
        return {
            "available": path.is_file(),
            "storage": "encrypted_local_vault",
            "provider": self._normalized_provider(provider),
        }

    def delete(self, external_user_id: Any, provider: str) -> bool:
        path = self._record_path(external_user_id, provider)
        if not path.exists():
            return False
        path.unlink()
        return True

    def _fernet(self):
        if Fernet is None:
            raise TokenStoreError("cryptography is required for encrypted OAuth credential storage")
        key = self._configured_key.encode("utf-8") if self._configured_key else self._load_or_create_key()
        try:
            return Fernet(key)
        except (TypeError, ValueError) as exc:
            raise TokenStoreError("LARO_TOKEN_ENCRYPTION_KEY is not a valid Fernet key") from exc

    def _load_or_create_key(self) -> bytes:
        self.root.mkdir(parents=True, exist_ok=True)
        key_path = self.root / ".laro-oauth-vault.key"
        if key_path.is_file():
            return key_path.read_bytes().strip()
        key = Fernet.generate_key()
        self._atomic_write(key_path, key)
        return key

    def _record_path(self, external_user_id: Any, provider: str) -> Path:
        identity = str(external_user_id or "anonymous").encode("utf-8")
        digest = hashlib.sha256(identity).hexdigest()
        return self.root / f"{self._normalized_provider(provider)}-{digest}.vault"

    @staticmethod
    def _normalized_provider(provider: str) -> str:
        value = str(provider or "").strip().lower()
        if not value:
            raise TokenStoreError("OAuth provider is required")
        return value

    def _normalized_payload(self, provider: str, token_response: Dict[str, Any]) -> Dict[str, Any]:
        token_keys = (
            "access_token",
            "refresh_token",
            "id_token",
            "token_type",
            "expires_in",
            "expiry",
            "scope",
            "scopes",
            "token_uri",
        )
        tokens = {key: token_response[key] for key in token_keys if token_response.get(key) is not None}
        # OAuth responses commonly provide only a relative lifetime. Persist an
        # absolute expiry so a later LARO restart can refresh the credential.
        if tokens.get("expires_in") is not None and not tokens.get("expiry"):
            try:
                tokens["expiry"] = (
                    dt.datetime.now(dt.timezone.utc)
                    + dt.timedelta(seconds=int(tokens["expires_in"]))
                ).isoformat()
            except (TypeError, ValueError):
                pass
        return {"version": 1, "provider": self._normalized_provider(provider), "tokens": tokens}

    @staticmethod
    def _atomic_write(path: Path, value: bytes) -> None:
        temporary = path.with_suffix(path.suffix + ".tmp")
        descriptor = os.open(str(temporary), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(value)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass
        except Exception:
            if temporary.exists():
                temporary.unlink()
            raise
