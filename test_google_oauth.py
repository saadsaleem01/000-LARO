import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from google_oauth import GOOGLE_SCOPES, build_google_oauth_url, google_oauth_config
from google_token_store import LocalEncryptedTokenStore


class GoogleOAuthTests(unittest.TestCase):
    def test_config_requires_complete_server_oauth_credentials(self):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "client-id",
            "GOOGLE_REDIRECT_URI": "http://localhost/callback",
        }, clear=True):
            self.assertFalse(google_oauth_config()["configured"])

    def test_build_google_oauth_url_uses_gmail_and_drive_read_scopes(self):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "client-id",
            "GOOGLE_CLIENT_SECRET": "client-secret",
            "GOOGLE_REDIRECT_URI": "http://localhost/callback",
        }, clear=True):
            url = build_google_oauth_url("state-token")

        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        self.assertEqual(parsed.netloc, "accounts.google.com")
        self.assertEqual(params["client_id"], ["client-id"])
        self.assertEqual(params["redirect_uri"], ["http://localhost/callback"])
        self.assertEqual(params["response_type"], ["code"])
        self.assertEqual(params["state"], ["state-token"])
        self.assertEqual(params["access_type"], ["offline"])
        self.assertEqual(params["scope"], [" ".join(GOOGLE_SCOPES)])


class GoogleOAuthRouteTests(unittest.TestCase):
    def setUp(self):
        import app as app_module
        self.app_module = app_module
        self.client = app_module.app.test_client()
        self.vault_directory = tempfile.TemporaryDirectory()
        self.previous_token_store = app_module.google_token_store
        app_module.google_token_store = LocalEncryptedTokenStore(self.vault_directory.name)

    def tearDown(self):
        self.app_module.google_token_store = self.previous_token_store
        self.vault_directory.cleanup()

    def test_popup_callback_returns_closeable_result_page_and_updates_status(self):
        with self.client.session_transaction() as sess:
            sess["google_oauth_state"] = "state-token"
            sess["google_oauth_return_to"] = "/dashboard_dark.html"
            sess["google_oauth_popup"] = True
            sess["user_email"] = "robert.local@laro"

        with patch.object(self.app_module, "exchange_google_oauth_code", return_value={"access_token": "raw-access-token"}):
            response = self.client.get("/api/google/oauth/callback?state=state-token&code=auth-code")

        body = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn("laro-google-oauth", body)
        self.assertIn("window.opener.postMessage", body)
        self.assertIn("Close", body)

        status = self.client.get("/api/google/oauth/status").get_json()
        self.assertTrue(status["connected"])
        self.assertEqual(status["status_source"], "legal_ledger")
        self.assertTrue(status["credential_vault"]["available"])

        restarted_status = self.client.get("/api/google/oauth/status").get_json()
        self.assertTrue(restarted_status["connected"])
        self.assertEqual(restarted_status["status_source"], "legal_ledger")

        connection = self.app_module.legal_ledger.get_external_connection("robert.local@laro", "google")
        self.assertTrue(connection["connected"])
        self.assertEqual(connection["provider"], "google")
        self.assertEqual(connection["scopes"], GOOGLE_SCOPES)
        self.assertTrue(connection["token_fingerprint"])
        serialized = str(connection)
        self.assertNotIn("token", connection["metadata"])
        self.assertNotIn("raw-access-token", serialized)
        self.assertNotIn("auth-code", serialized)


if __name__ == "__main__":
    unittest.main()
