import unittest

from document_case_matching import rank_document_cases


class TestDocumentCaseMatching(unittest.TestCase):
    def test_reference_and_party_match_rank_the_correct_case_first(self):
        cases = [
            {
                "case_id": 1,
                "title": "CAK billing objection",
                "legal_domain": "administrative_law",
                "court_or_institution": "CAK",
                "parties": [{"name": "CAK"}],
                "identifiers": [{"identifier_value": "CAK-2026-4431"}],
            },
            {
                "case_id": 2,
                "title": "Vivare repair delay",
                "legal_domain": "tenancy_law",
                "parties": [{"name": "Vivare"}],
                "identifiers": [{"identifier_value": "VIV-991"}],
            },
        ]
        matches = rank_document_cases({
            "title": "Decision on objection CAK-2026-4431",
            "sender": "CAK",
            "extracted_text": "CAK decided the objection under reference CAK-2026-4431.",
            "analysis": {"topics": ["administrative_law"]},
        }, cases)

        self.assertEqual(matches[0]["case_id"], 1)
        self.assertEqual(matches[0]["confidence"], "high")
        self.assertTrue(matches[0]["requires_review"])
        self.assertTrue(any("case reference" in reason for reason in matches[0]["reasons"]))
        self.assertFalse(any(item["case_id"] == 2 for item in matches))

    def test_generic_source_does_not_fabricate_a_case_match(self):
        matches = rank_document_cases({
            "title": "General correspondence",
            "extracted_text": "Please retain this letter for your records.",
            "analysis": {"topics": []},
        }, [{
            "case_id": 7,
            "title": "Housing repair dispute",
            "legal_domain": "tenancy_law",
            "parties": [{"name": "Housing provider"}],
        }])

        self.assertEqual(matches, [])


if __name__ == "__main__":
    unittest.main()
