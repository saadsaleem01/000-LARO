import os
import tempfile
import unittest

from document_aggregation import DocumentAggregator
from document_intelligence import DocumentIntelligenceEngine
from serverless_functions import logger as serverless_logger
from serverless_functions import process_document


class TestDocumentIntelligenceEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DocumentIntelligenceEngine()
        self.text = (
            "Zaaknummer: AMS-12345. Op 2024-03-10 heeft de verhuurder een ingebrekestelling ontvangen. "
            "De huurder moet EUR 1.250 betalen binnen 14 dagen volgens artikel 7:204 BW. "
            "If the defect is not repaired before 2024-03-24, the tenant will start court proceedings."
        )

    def test_analyze_text_extracts_legal_signals(self):
        analysis = self.engine.analyze_text(self.text, document_name="notice.txt")

        self.assertTrue(analysis["readable"])
        self.assertEqual(analysis["document_type"], "notice")
        self.assertTrue(any(topic["topic"] == "tenancy_law" for topic in analysis["topics"]))
        self.assertGreaterEqual(analysis["evidence"]["relevance_score"], 0.7)
        self.assertEqual(analysis["facts"]["dates"][0]["normalized"], "2024-03-10")
        self.assertTrue(any(ref["type"] == "case_number" for ref in analysis["facts"]["legal_references"]))
        self.assertTrue(analysis["facts"]["monetary_amounts"])
        self.assertTrue(analysis["facts"]["obligations"])
        self.assertTrue(analysis["risks"])

    def test_analysis_keeps_material_source_passages_and_date_locators(self):
        analysis = self.engine.analyze_text(self.text, document_name="notice.txt")

        findings = analysis["findings"]
        first_date = analysis["facts"]["dates"][0]
        first_event = analysis["evidence"]["chronology_events"][0]

        self.assertTrue(findings["source_passages"])
        self.assertIn("obligation", findings["category_counts"])
        self.assertFalse(findings["complete_statement_inventory"])
        self.assertEqual(analysis["processing"]["analysis_method"], "rule_based_source_passage_v1")
        self.assertIn("source_locator", first_date)
        self.assertTrue(first_date["source_locator"]["passage_id"])
        self.assertEqual(first_event["source_locator"], first_date["source_locator"])

    def test_extract_text_from_file_reads_real_upload(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
            handle.write(self.text)
            file_path = handle.name

        try:
            extracted = self.engine.extract_text_from_file(file_path)
        finally:
            os.unlink(file_path)

        self.assertIn("Zaaknummer", extracted)
        self.assertIn("artikel 7:204 BW", extracted)

    def test_build_evidence_timeline_links_back_to_source_documents(self):
        document = self.engine.enrich_document({
            "document_id": "doc-123",
            "document_name": "CAK decision.pdf",
            "document_type": "document",
            "source": "google_drive",
            "source_url": "https://drive.example/doc-123",
            "content": self.text,
        })

        timeline = self.engine.build_evidence_timeline([document])

        self.assertTrue(timeline)
        self.assertEqual(timeline[0]["source_document_id"], "doc-123")
        self.assertEqual(timeline[0]["source_document_name"], "CAK decision.pdf")
        self.assertEqual(timeline[0]["source_url"], "https://drive.example/doc-123")
        self.assertEqual(timeline[0]["source_anchor"], "document-doc-123")
        self.assertIn("summary", timeline[0])
        self.assertIn("actor", timeline[0])
        self.assertIn("action", timeline[0])
        self.assertIn("event_label", timeline[0])
        self.assertIn("evidence_quote", timeline[0])

    def test_timeline_event_fields_capture_who_did_what_from_source_metadata(self):
        analysis = self.engine.analyze_text(
            "On 2026-07-10, CAK stated Robert must provide the bank statement by 2026-08-14.",
            document_name="CAK request.txt",
            metadata={"sender": "CAK", "recipient": "Robert"},
        )

        events = analysis["evidence"]["chronology_events"]
        self.assertTrue(events)
        self.assertEqual(events[0]["actor"], "CAK")
        self.assertEqual(events[0]["action"], "stated")
        self.assertEqual(events[0]["affected_party"], "Robert")
        self.assertEqual(events[0]["event_kind"], "communication")

        inferred = self.engine.timeline_event_fields(
            "On 2026-07-10, CAK stated Robert must provide the bank statement by 2026-08-14."
        )
        self.assertEqual(inferred["actor"], "CAK")


class TestDocumentAggregationIntelligence(unittest.TestCase):
    def test_manual_upload_is_enriched_with_legal_analysis(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
            handle.write(
                "Contract signed on 2024-01-15. The employer must pay salary before 2024-02-01."
            )
            file_path = handle.name

        try:
            aggregator = DocumentAggregator(case_id=1, user_id=2)
            document = aggregator.process_manual_upload(file_path, "employment-contract.txt")
        finally:
            os.unlink(file_path)

        self.assertIn("legal_analysis", document)
        self.assertIn("content_summary", document)
        self.assertTrue(document["legal_analysis"]["facts"]["dates"])
        self.assertGreater(document["legal_analysis"]["evidence"]["relevance_score"], 0)


class TestServerlessDocumentProcessing(unittest.TestCase):
    def test_process_document_returns_structured_legal_analysis(self):
        result = process_document(
            {
                "document_id": "doc-1",
                "document_data": {
                    "case_id": 10,
                    "document_name": "summons.txt",
                    "content": "Court deadline on 2024-04-01. Ref: LARO-2024-001. Payment due EUR 500.",
                },
            },
            {},
        )

        self.assertEqual(result["statusCode"], 200)
        body = result["body"]
        self.assertIn("legal_analysis", body["analysis"])
        self.assertTrue(body["analysis"]["legal_analysis"]["facts"]["dates"])
        self.assertGreater(body["metadata"]["relevance_score"], 0)

    def test_process_document_does_not_log_legal_text(self):
        legal_text = "Confidential client statement that must not enter application logs."

        with self.assertLogs(serverless_logger, level="INFO") as captured:
            result = process_document(
                {
                    "document_id": "doc-private",
                    "document_data": {
                        "case_id": 11,
                        "document_name": "client-statement.txt",
                        "content": legal_text,
                    },
                },
                {},
            )

        self.assertEqual(result["statusCode"], 200)
        self.assertNotIn(legal_text, "\n".join(captured.output))


if __name__ == "__main__":
    unittest.main()
