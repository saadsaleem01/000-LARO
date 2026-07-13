import hashlib
import json
import os
import tempfile
import unittest
import zipfile
from io import BytesIO

from case_bundle_export import CaseBundleExporter


class TestCaseBundleExporter(unittest.TestCase):
    def _bundle(self):
        snapshot_hash = "a" * 64
        return {
            "case_id": 7,
            "bundle_snapshot_hash": snapshot_hash,
            "snapshot_counts": {"documents": 1, "timeline": 1},
            "external_sharing_allowed": True,
            "external_sharing_approval": {
                "id": 19,
                "status": "approved",
                "context": {"bundle_snapshot_hash": snapshot_hash},
            },
            "summary": {
                "case": {
                    "case_id": 7,
                    "title": "Tenant repair dispute",
                    "description": "The approved factual case summary.",
                    "local_path": "C:/private/ledger.sqlite3",
                    "password": "must-not-export",
                    "oauth_access_token": "also-must-not-export",
                }
            },
            "red_line": {"body": "Source-linked red-line body."},
            "source_linked_timeline": [{"date": "2026-07-10", "title": "Repair requested"}],
            "claims": {"supported": [{"statement": "Repair was requested."}]},
            "review_items": {"contradictions": []},
            "next_actions": [{"target": "evidence", "label": "Review source"}],
            "outreach": [],
            "lawyer_responses": [],
            "drafts": [],
            "approvals": [],
            "audit_events": [],
        }

    def test_export_contains_source_provenance_without_machine_paths(self):
        with tempfile.TemporaryDirectory() as root:
            source_path = os.path.join(root, "notice.txt")
            with open(source_path, "wb") as handle:
                handle.write(b"Original source bytes")

            def resolver(value):
                resolved = os.path.abspath(str(value or ""))
                return resolved if os.path.commonpath([root, resolved]) == root and os.path.isfile(resolved) else None

            exported = CaseBundleExporter(safe_file_resolver=resolver).build(self._bundle(), [{
                "document_id": 3,
                "title": "Repair notice",
                "original_filename": "notice.txt",
                "local_path": source_path,
                "content_hash": hashlib.sha256(b"Original source bytes").hexdigest(),
                "source_type": "manual_upload",
                "source_uri": "https://drive.google.com/file/source?access_token=private&usp=sharing",
                "document_type": "notice",
                "extracted_text": "Extracted repair notice text.",
                "confidentiality_level": "sensitive",
            }])

            self.assertEqual(exported["archive_sha256"], hashlib.sha256(exported["archive_bytes"]).hexdigest())
            with zipfile.ZipFile(BytesIO(exported["archive_bytes"])) as archive:
                names = set(archive.namelist())
                self.assertIn("manifest.json", names)
                self.assertIn("documents/index.json", names)
                self.assertIn("documents/0003_notice.txt", names)
                self.assertIn("documents/0003_notice_extracted.txt", names)
                self.assertEqual(archive.read("documents/0003_notice.txt"), b"Original source bytes")
                case_payload = json.loads(archive.read("case.json"))
                self.assertNotIn("local_path", case_payload)
                self.assertNotIn("password", case_payload)
                self.assertNotIn("oauth_access_token", case_payload)
                index = json.loads(archive.read("documents/index.json"))
                self.assertNotIn("local_path", index[0])
                self.assertEqual(len(index[0]["included_entries"]), 2)
                self.assertNotIn("access_token", index[0]["source_uri"])
                self.assertIn("usp=sharing", index[0]["source_uri"])
                manifest = json.loads(archive.read("manifest.json"))
                self.assertEqual(manifest["approval_id"], 19)
                self.assertFalse(manifest["external_action_taken"])
                self.assertTrue(all(item.get("sha256") for item in manifest["entries"]))

    def test_export_omits_oversized_source_files_and_records_reason(self):
        with tempfile.TemporaryDirectory() as root:
            source_path = os.path.join(root, "oversized.bin")
            with open(source_path, "wb") as handle:
                handle.write(b"x" * (1024 * 1024 + 32))

            exporter = CaseBundleExporter(
                safe_file_resolver=lambda value: source_path if value == source_path else None,
                max_uncompressed_bytes=1024 * 1024,
            )
            exported = exporter.build(self._bundle(), [{
                "document_id": 8,
                "title": "Oversized source",
                "original_filename": "oversized.bin",
                "local_path": source_path,
            }])

            manifest = exported["manifest"]
            self.assertTrue(any(item["name"].endswith("oversized.bin") for item in manifest["omitted_entries"]))
            with zipfile.ZipFile(BytesIO(exported["archive_bytes"])) as archive:
                self.assertFalse(any(name.endswith("oversized.bin") for name in archive.namelist()))


if __name__ == "__main__":
    unittest.main()
