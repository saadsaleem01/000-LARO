import unittest

from outreach_target_matching import OutreachTargetEngine
from serverless_functions import match_outreach_targets


TEST_TARGETS = [
    {
        "id": "fixture-media",
        "target_type": "media",
        "name": "Fixture Consumer Desk",
        "subtype": "consumer program",
        "topics": ["consumer", "contracts", "misleading claims"],
        "legal_fields": ["CONTRACT_LAW"],
        "channels": ["web"],
        "source_url": "https://example.test/media",
        "contact_url": "https://example.test/media/contact",
        "influence_score": 0.8,
        "actionability_score": 0.8,
        "confidence": "high",
    },
    {
        "id": "fixture-organization",
        "target_type": "organization",
        "name": "Fixture Tenant Support",
        "subtype": "tenant advocacy",
        "topics": ["housing", "rent", "tenants", "maintenance"],
        "legal_fields": ["PROPERTY_LAW"],
        "channels": ["advocacy"],
        "source_url": "https://example.test/organization",
        "contact_url": "https://example.test/organization/contact",
        "influence_score": 0.8,
        "actionability_score": 0.8,
        "confidence": "high",
    },
]


class TestOutreachTargets(unittest.TestCase):
    def test_media_matching_returns_consumer_programs(self):
        engine = OutreachTargetEngine()

        result = engine.match({
            "target_type": "media",
            "description": "Consumer contract dispute with a company, misleading claims and housing impact.",
            "legal_fields": ["CONTRACT_LAW"],
            "evidence_topics": ["consumer", "contracts", "misleading claims"],
            "max_results": 5,
        }, records=TEST_TARGETS)

        self.assertEqual(result["target_type"], "media")
        self.assertGreaterEqual(result["result_count"], 1)
        names = [target["name"] for target in result["matched_targets"]]
        self.assertIn("Fixture Consumer Desk", names)
        self.assertTrue(result["matched_targets"][0]["match_reasons"])

    def test_organization_matching_returns_advocacy_groups(self):
        engine = OutreachTargetEngine()

        result = engine.match({
            "target_type": "organization",
            "description": "Housing and rent dispute with landlord maintenance problems.",
            "legal_fields": ["PROPERTY_LAW"],
            "evidence_topics": ["housing", "rent", "tenants"],
            "max_results": 5,
        }, records=TEST_TARGETS)

        self.assertEqual(result["target_type"], "organization")
        self.assertGreaterEqual(result["result_count"], 1)
        self.assertEqual(result["matched_targets"][0]["name"], "Fixture Tenant Support")

    def test_topic_reasons_do_not_treat_legal_field_or_region_as_case_evidence(self):
        result = OutreachTargetEngine().match({
            "target_type": "organization",
            "description": "Tenant needs help with rent arrears.",
            "legal_fields": ["ADMINISTRATIVE_LAW"],
            "region": "Netherlands",
        }, records=[{
            "id": "topic-fixture",
            "target_type": "organization",
            "name": "Tenant fixture",
            "topics": ["rent"],
            "legal_fields": ["ADMINISTRATIVE_LAW"],
            "source_url": "https://example.test/topic-fixture",
        }])

        reasons = result["matched_targets"][0]["match_reasons"]
        self.assertTrue(any(reason.startswith("Matches case topics: rent") for reason in reasons))
        self.assertFalse(any("administrative" in reason.lower() and "topics" in reason.lower() for reason in reasons))
        self.assertFalse(any("netherlands" in reason.lower() for reason in reasons))

    def test_serverless_match_outreach_targets_returns_metadata(self):
        result = match_outreach_targets({
            "case_id": 909,
            "target_type": "organization",
            "case_data": {
                "description": "Privacy and data access dispute with a government body.",
                "legal_fields": ["ADMINISTRATIVE_LAW"],
                "evidence_topics": ["privacy", "data", "government"],
            },
            "max_results": 5,
            "candidate_targets": TEST_TARGETS,
        }, {})

        self.assertEqual(result["statusCode"], 200)
        body = result["body"]
        self.assertIn("matched_targets", body)
        self.assertIn("search_criteria", body)
        self.assertEqual(body["target_type"], "organization")

    def test_explicit_candidate_records_keep_source_urls(self):
        types = {record["target_type"] for record in TEST_TARGETS}

        self.assertIn("media", types)
        self.assertIn("organization", types)
        self.assertTrue(all(record.get("source_url") for record in TEST_TARGETS))


if __name__ == "__main__":
    unittest.main()
