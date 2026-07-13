import unittest
from unittest import mock

from outreach_discovery import OutreachDiscoveryError, OutreachTargetDiscovery


SEARCH_HTML = """
<html><body>
  <div class="result">
    <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Ftenant-help.example%2Fabout%3Futm_source%3Dsearch">Tenant Help</a>
    <a class="result__snippet">Independent tenant advocacy and rent support.</a>
  </div>
  <article>
    <a data-testid="result-title-a" href="https://media-watch.example/contact">Media Watch</a>
    <div data-testid="result-snippet">Public-interest reporting desk.</div>
  </article>
</body></html>
"""


class _Response:
    status_code = 200

    def __init__(self, text=SEARCH_HTML):
        self.text = text

    def raise_for_status(self):
        return None


class TestOutreachDiscovery(unittest.TestCase):
    def test_search_candidates_preserve_source_and_review_metadata(self):
        http_get = mock.Mock(return_value=_Response())
        discovery = OutreachTargetDiscovery(http_get=http_get)

        result = discovery.discover("organization", "Dutch tenant support", limit=10)

        self.assertEqual(result["provider"], "duckduckgo_html")
        self.assertEqual(result["result_count"], 2)
        first = result["candidates"][0]
        self.assertEqual(first["name"], "Tenant Help")
        self.assertEqual(first["source_url"], "https://tenant-help.example/about")
        self.assertEqual(first["confidence"], "discovery_candidate")
        self.assertEqual(first["topics"], [])
        self.assertEqual(first["metadata"]["discovery_query"], "Dutch tenant support")
        self.assertIn("Verify", first["metadata"]["review_note"])
        http_get.assert_called_once()
        self.assertEqual(http_get.call_args.kwargs["params"]["q"], "Dutch tenant support")

    def test_rejects_empty_or_unbounded_discovery_input(self):
        discovery = OutreachTargetDiscovery(http_get=mock.Mock())
        with self.assertRaisesRegex(OutreachDiscoveryError, "Enter an external"):
            discovery.discover("media", "")
        with self.assertRaisesRegex(OutreachDiscoveryError, "target_type"):
            discovery.discover("lawyer", "consumer advocates")

    def test_provider_human_verification_is_not_reported_as_zero_results(self):
        response = _Response('<form id="challenge-form">confirm this search was made by a human</form>')
        response.status_code = 202
        discovery = OutreachTargetDiscovery(http_get=mock.Mock(return_value=response))

        with self.assertRaisesRegex(OutreachDiscoveryError, "human verification"):
            discovery.discover("media", "Nederland huurders journalist")

    def test_case_query_plan_uses_only_official_legal_area_labels(self):
        discovery = OutreachTargetDiscovery(http_get=mock.Mock())

        plan = discovery.plan_case_queries(
            "organization",
            ["PROPERTY_LAW", "ADMINISTRATIVE_LAW"],
            max_queries=4,
        )

        self.assertEqual(len(plan), 4)
        self.assertTrue(all(item["query"].startswith("Nederland ") for item in plan))
        self.assertTrue(all(item["raw_case_text_shared"] is False for item in plan))
        self.assertEqual({item["legal_field"] for item in plan}, {"PROPERTY_LAW", "ADMINISTRATIVE_LAW"})
        self.assertTrue(any("Huurrecht" in item["query"] for item in plan))
        self.assertTrue(any("Bestuursrecht" in item["query"] for item in plan))
        single_field_plan = discovery.plan_case_queries("media", "PROPERTY_LAW", max_queries=1)
        self.assertEqual(single_field_plan[0]["legal_field"], "PROPERTY_LAW")

    def test_case_discovery_deduplicates_queries_and_preserves_coverage(self):
        http_get = mock.Mock(return_value=_Response())
        discovery = OutreachTargetDiscovery(http_get=http_get)

        result = discovery.discover_for_case(
            "organization",
            ["PROPERTY_LAW", "ADMINISTRATIVE_LAW"],
            limit=20,
            max_queries=2,
        )

        self.assertEqual(result["provider"], "duckduckgo_html_multi_query")
        self.assertEqual(result["result_count"], 2)
        self.assertEqual(http_get.call_count, 2)
        coverage = result["coverage"]
        self.assertEqual(coverage["planned_query_count"], 2)
        self.assertEqual(coverage["completed_query_count"], 2)
        self.assertEqual(coverage["raw_result_count"], 4)
        self.assertEqual(coverage["unique_candidate_count"], 2)
        self.assertFalse(coverage["raw_case_text_shared"])
        self.assertEqual(len(coverage["external_values_sent"]), 2)
        tenant = next(item for item in result["candidates"] if item["name"] == "Tenant Help")
        self.assertEqual(set(tenant["legal_fields"]), {"PROPERTY_LAW", "ADMINISTRATIVE_LAW"})
        self.assertEqual(tenant["subtype"], "advocacy candidate")
        self.assertEqual(len(tenant["metadata"]["discovery_queries"]), 2)

    def test_case_discovery_returns_partial_coverage_when_one_query_is_blocked(self):
        challenge = _Response('<form id="challenge-form">confirm this search was made by a human</form>')
        challenge.status_code = 202
        discovery = OutreachTargetDiscovery(http_get=mock.Mock(side_effect=[_Response(), challenge]))

        result = discovery.discover_for_case(
            "media",
            ["PROPERTY_LAW"],
            limit=20,
            max_queries=2,
        )

        self.assertEqual(result["result_count"], 2)
        self.assertEqual(result["coverage"]["completed_query_count"], 1)
        self.assertEqual(result["coverage"]["failed_query_count"], 1)
        self.assertIn("human verification", result["coverage"]["failed_queries"][0]["error"])


if __name__ == "__main__":
    unittest.main()
