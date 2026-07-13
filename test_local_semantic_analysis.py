import json
import unittest

from document_intelligence import DocumentIntelligenceEngine
from local_semantic_analysis import LocalSemanticAnalysisProvider


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class TestLocalSemanticAnalysisProvider(unittest.TestCase):
    def test_local_ollama_output_keeps_only_literal_source_citations(self):
        calls = []

        def fake_post(url, **kwargs):
            calls.append({"url": url, **kwargs})
            return FakeResponse({"response": json.dumps({
                "findings": [
                    {
                        "category": "decision",
                        "source_quote": "CAK decided that Robert must pay EUR 125.",
                        "observation": "The source records a payment decision.",
                    },
                    {
                        "category": "deadline",
                        "source_quote": "Invented deadline that is not in the source.",
                        "observation": "This must be discarded.",
                    },
                ],
                "review_questions": [
                    {
                        "question": "Confirm whether an objection was filed.",
                        "source_quote": "File an objection before 2026-07-15.",
                    },
                ],
            })})

        provider = LocalSemanticAnalysisProvider({
            "provider": "ollama",
            "base_url": "http://127.0.0.1:11434",
            "model": "local-legal-model",
        }, request_post=fake_post)
        result = provider.analyze(
            "CAK decided that Robert must pay EUR 125. File an objection before 2026-07-15.",
            document_name="CAK decision",
        )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["provider"], "ollama")
        self.assertEqual(len(result["findings"]), 1)
        self.assertEqual(result["findings"][0]["category"], "decision")
        self.assertEqual(result["rejected_uncited_findings"], 1)
        self.assertEqual(len(result["review_questions"]), 1)
        self.assertEqual(calls[0]["url"], "http://127.0.0.1:11434/api/generate")
        self.assertTrue(calls[0]["json"]["stream"] is False)

    def test_non_literal_loopback_configuration_never_receives_source_text(self):
        for base_url in ("https://example.test", "http://localhost:11434"):
            with self.subTest(base_url=base_url):
                calls = []
                provider = LocalSemanticAnalysisProvider({
                    "provider": "ollama",
                    "base_url": base_url,
                    "model": "not-allowed",
                }, request_post=lambda *args, **kwargs: calls.append((args, kwargs)))

                result = provider.analyze("Private legal source text.")

                self.assertEqual(result["status"], "configuration_invalid")
                self.assertEqual(calls, [])

    def test_document_engine_keeps_semantic_output_as_review_only(self):
        class SemanticFixture:
            def analyze(self, text, document_name=""):
                return {
                    "status": "completed",
                    "provider": "ollama",
                    "model": "fixture",
                    "findings": [{
                        "category": "decision",
                        "source_quote": "CAK decided on 2026-07-01.",
                        "observation": "A decision is recorded.",
                        "review_status": "needs_review",
                    }],
                    "review_questions": [],
                    "limitations": ["Review source."],
                }

        analysis = DocumentIntelligenceEngine(semantic_provider=SemanticFixture()).analyze_text(
            "CAK decided on 2026-07-01.", document_name="decision.txt"
        )

        self.assertEqual(analysis["semantic_reading"]["findings"][0]["review_status"], "needs_review")
        self.assertEqual(analysis["processing"]["semantic_analysis_status"], "completed")
        self.assertEqual(analysis["processing"]["analysis_method"], "rule_based_source_passage_v1")

    def test_case_analysis_requires_document_scoped_literal_citations(self):
        def fake_post(url, **kwargs):
            return FakeResponse({"response": json.dumps({
                "findings": [
                    {
                        "category": "cross_document_conflict",
                        "observation": "The amounts differ between sources.",
                        "sources": [
                            {"document_id": "1", "source_quote": "CAK asks for EUR 125."},
                            {"document_id": "2", "source_quote": "The notice asks for EUR 250."},
                        ],
                    },
                    {
                        "category": "cross_document_conflict",
                        "observation": "This must be discarded.",
                        "sources": [{"document_id": "99", "source_quote": "Invented source."}],
                    },
                ],
                "review_questions": [{
                    "category": "open_question",
                    "question": "Which amount is currently claimed?",
                    "sources": [{"document_id": "2", "source_quote": "The notice asks for EUR 250."}],
                }],
            })})

        provider = LocalSemanticAnalysisProvider({
            "provider": "ollama",
            "base_url": "http://127.0.0.1:11434",
            "model": "local-legal-model",
        }, request_post=fake_post)
        result = provider.analyze_case([
            {"document_id": 1, "title": "Decision", "content_hash": "one", "extracted_text": "CAK asks for EUR 125."},
            {"document_id": 2, "title": "Notice", "content_hash": "two", "extracted_text": "The notice asks for EUR 250."},
        ], {"title": "CAK review"})

        self.assertEqual(result["status"], "completed")
        self.assertTrue(any(
            item["observation"] == "The amounts differ between sources."
            and item["sources"][1]["document_id"] == "2"
            for item in result["findings"]
        ))
        self.assertGreaterEqual(result["rejected_uncited_findings"], 1)
        self.assertTrue(any(
            item["question"] == "Which amount is currently claimed?"
            for item in result["review_questions"]
        ))
        self.assertEqual(len(result["source_documents"]), 2)

    def test_default_case_analysis_compares_literal_sources_without_ollama(self):
        provider = LocalSemanticAnalysisProvider({"provider": "rule_based"})

        result = provider.analyze_case([
            {
                "document_id": 1,
                "title": "Decision",
                "sender": "CAK",
                "recipient": "Robert",
                "extracted_text": "Decision dated 2024-05-01. Case reference CAK-42. The decision records a payment amount of EUR 125.",
            },
            {
                "document_id": 2,
                "title": "Notice",
                "extracted_text": "Notice dated 15/05/2024. Case reference CAK-42. The payment notice records a payment amount of EUR 250.",
            },
            {
                "document_id": 3,
                "title": "Undated notice",
                "extracted_text": "Submit the objection before the deadline.",
            },
        ])

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["provider"], "rule_based")
        self.assertEqual(result["analysis_method"], "full_source_deterministic_comparison_v2")
        conflict = next(item for item in result["findings"] if item["category"] == "cross_document_conflict")
        self.assertEqual([source["document_id"] for source in conflict["sources"]], ["1", "2"])
        self.assertIn("EUR 125", conflict["sources"][0]["source_quote"])
        self.assertTrue(any(item["category"] == "corroboration" for item in result["findings"]))
        self.assertTrue(any(item["category"] == "evidence_gap" for item in result["findings"]))
        self.assertTrue(any("current" in item["question"] for item in result["review_questions"]))
        self.assertEqual([item["event_date"] for item in result["timeline_suggestions"]], ["2024-05-01", "2024-05-15"])
        self.assertIn("Decision dated 2024-05-01", result["timeline_suggestions"][0]["sources"][0]["source_quote"])
        self.assertEqual(result["timeline_suggestions"][0]["actor"], "CAK")
        self.assertEqual(result["timeline_suggestions"][0]["action"], "decided")
        self.assertEqual(result["timeline_suggestions"][0]["affected_party"], "Robert")
        self.assertEqual(result["timeline_suggestions"][0]["event_kind"], "decision")

    def test_default_case_analysis_proposes_each_unambiguous_date_in_a_source_passage(self):
        provider = LocalSemanticAnalysisProvider({"provider": "rule_based"})

        result = provider.analyze_case([{
            "document_id": 1,
            "title": "Decision and deadline",
            "extracted_text": "The decision is dated 2024-05-01 and the objection deadline is 2024-05-15.",
        }])

        self.assertEqual([item["event_date"] for item in result["timeline_suggestions"]], ["2024-05-01", "2024-05-15"])
        self.assertTrue(all(
            item["sources"][0]["source_quote"] == "The decision is dated 2024-05-01 and the objection deadline is 2024-05-15."
            for item in result["timeline_suggestions"]
        ))

    def test_case_analysis_reads_every_source_when_earlier_source_is_large(self):
        provider = LocalSemanticAnalysisProvider({"provider": "rule_based", "max_chars": 1000})
        result = provider.analyze_case([
            {
                "document_id": 1,
                "title": "Long correspondence",
                "extracted_text": "Opening correspondence. " + ("Background detail. " * 80) + "The other party says the amount is EUR 125.",
            },
            {
                "document_id": 2,
                "title": "Later decision",
                "extracted_text": "The authority decision dated 2026-08-15 requires payment of EUR 250 before the deadline.",
            },
        ])

        coverage = result["source_coverage"]
        self.assertEqual(coverage["sources_readable"], 2)
        self.assertEqual(coverage["sources_represented"], 2)
        self.assertEqual(coverage["sources_partially_read"], 0)
        self.assertEqual(coverage["coverage_percent"], 100.0)
        self.assertEqual(coverage["characters_analyzed"], coverage["characters_total"])
        self.assertEqual({item["document_id"] for item in result["source_documents"]}, {1, 2})
        self.assertTrue(any(
            item["event_date"] == "2026-08-15" and item["sources"][0]["document_id"] == "2"
            for item in result["timeline_suggestions"]
        ))

    def test_case_analysis_reads_late_high_signal_passage_from_large_source(self):
        provider = LocalSemanticAnalysisProvider({"provider": "rule_based", "max_chars": 1000})
        result = provider.analyze_case([{
            "document_id": 1,
            "title": "Long decision",
            "extracted_text": "Opening note. " + ("Background detail. " * 90) + "The objection deadline is 2026-09-10.",
        }])

        self.assertFalse(result["source_was_truncated"])
        self.assertEqual(result["source_coverage"]["coverage_percent"], 100.0)
        self.assertTrue(any(item["event_date"] == "2026-09-10" for item in result["timeline_suggestions"]))

    def test_document_ollama_analysis_reads_every_chunk_and_keeps_late_citation(self):
        calls = []
        late_quote = "The final notice sets the objection deadline at 2026-11-30."

        def fake_post(url, **kwargs):
            prompt = kwargs["json"]["prompt"]
            calls.append(prompt)
            findings = [{
                "category": "deadline",
                "source_quote": late_quote,
                "observation": "The final passage records an objection deadline.",
            }] if late_quote in prompt else []
            return FakeResponse({"response": json.dumps({"findings": findings, "review_questions": []})})

        provider = LocalSemanticAnalysisProvider({
            "provider": "ollama",
            "base_url": "http://127.0.0.1:11434",
            "model": "local-legal-model",
            "max_chars": 1000,
        }, request_post=fake_post)
        source = "Opening correspondence. " + ("Background paragraph without a legal signal. " * 80) + late_quote

        result = provider.analyze(source, document_name="Long notice")

        self.assertEqual(result["status"], "completed")
        self.assertGreater(len(calls), 1)
        self.assertEqual(result["analysis_batches"], len(calls))
        self.assertFalse(result["source_was_truncated"])
        self.assertEqual(result["source_characters_analyzed"], len(provider._clean(source)))
        self.assertTrue(any(item["source_quote"] == late_quote for item in result["findings"]))

    def test_chunked_case_analysis_reports_full_coverage_and_real_progress(self):
        calls = []
        progress = []
        late_quote = "Late decision dated 2026-12-05 requires payment of EUR 275."

        def fake_post(url, **kwargs):
            prompt = kwargs["json"]["prompt"]
            calls.append(prompt)
            findings = [{
                "category": "case_position",
                "observation": "A late source passage records a decision and payment amount.",
                "sources": [{"document_id": "1", "source_quote": late_quote}],
            }] if late_quote in prompt else []
            return FakeResponse({"response": json.dumps({
                "findings": findings,
                "review_questions": [],
                "timeline_suggestions": [],
            })})

        provider = LocalSemanticAnalysisProvider({
            "provider": "ollama",
            "base_url": "http://127.0.0.1:11434",
            "model": "local-legal-model",
            "max_chars": 1000,
        }, request_post=fake_post)
        first_source = "Opening evidence. " + ("Long factual background. " * 100) + late_quote
        second_source = "Second source confirms case reference TEST-2026 and requests review before 2026-12-20."

        result = provider.analyze_case([
            {"document_id": 1, "title": "Long decision", "extracted_text": first_source},
            {"document_id": 2, "title": "Follow-up", "extracted_text": second_source},
        ], progress_callback=progress.append)

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["analysis_method"], "chunked_local_semantic_case_analysis_v1")
        self.assertGreater(len(calls), 1)
        self.assertEqual(result["analysis_batches"], len(calls))
        self.assertEqual(result["source_coverage"]["coverage_percent"], 100.0)
        self.assertEqual(result["source_coverage"]["sources_fully_read"], 2)
        self.assertFalse(result["source_was_truncated"])
        self.assertEqual(progress[-1]["processed_words"], progress[-1]["total_words"])
        self.assertEqual(progress[-1]["processed_characters"], progress[-1]["total_characters"])
        self.assertTrue(any(item["sources"][0]["source_quote"] == late_quote for item in result["findings"]))

    def test_chunked_case_analysis_discards_partial_findings_when_a_batch_fails(self):
        calls = []

        def fake_post(url, **kwargs):
            calls.append(kwargs["json"]["prompt"])
            if len(calls) > 1:
                raise ValueError("local model stopped")
            return FakeResponse({"response": json.dumps({
                "findings": [{
                    "category": "case_position",
                    "observation": "This partial result must not be retained.",
                    "sources": [{"document_id": "1", "source_quote": "Opening source passage."}],
                }],
                "review_questions": [],
                "timeline_suggestions": [],
            })})

        provider = LocalSemanticAnalysisProvider({
            "provider": "ollama",
            "base_url": "http://127.0.0.1:11434",
            "model": "local-legal-model",
            "max_chars": 1000,
        }, request_post=fake_post)
        result = provider.analyze_case([{
            "document_id": 1,
            "title": "Interrupted source",
            "extracted_text": "Opening source passage. " + ("Long factual background. " * 120),
        }])

        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["findings"], [])
        self.assertTrue(result["source_was_truncated"])
        self.assertLess(result["source_coverage"]["coverage_percent"], 100.0)
        self.assertIn("no partial case-wide findings were stored", result["limitations"][0])


if __name__ == "__main__":
    unittest.main()
