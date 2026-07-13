import unittest

from case_matching import LegalCaseMatcher
from dutch_legal_taxonomy import (
    DUTCH_LEGAL_AREAS,
    build_case_matching_profile,
    infer_legal_fields,
    normalize_legal_fields,
    public_taxonomy,
)


class TestDutchLegalTaxonomy(unittest.TestCase):
    def test_taxonomy_contains_all_registered_nova_areas_with_unique_ids(self):
        payload = public_taxonomy()

        self.assertEqual(payload["registered_area_count"], 35)
        self.assertEqual(len(DUTCH_LEGAL_AREAS), 35)
        self.assertEqual(len({item["key"] for item in DUTCH_LEGAL_AREAS}), 35)
        self.assertEqual(len({item["nova_id"] for item in DUTCH_LEGAL_AREAS}), 35)
        self.assertIn("Sociaal-zekerheidsrecht", {item["name_nl"] for item in DUTCH_LEGAL_AREAS})
        self.assertIn("Verzekeringsrecht", {item["name_nl"] for item in DUTCH_LEGAL_AREAS})

    def test_normalization_preserves_legacy_keys_and_official_dutch_names(self):
        self.assertEqual(
            normalize_legal_fields(["huurrecht", "consumer_law", "Privacy recht"]),
            ["PROPERTY_LAW", "CONTRACT_LAW", "PRIVACY_LAW"],
        )

    def test_multidomain_case_infers_social_security_and_insurance(self):
        fields = infer_legal_fields(
            "UWV weigerde mijn WIA-uitkering. De verzekeraar weigert daarnaast dekking onder de polis."
        )

        self.assertIn("SOCIAL_SECURITY_LAW", fields)
        self.assertIn("INSURANCE_LAW", fields)

    def test_case_profile_reads_persisted_sources_but_returns_only_derived_signals(self):
        confidential_phrase = "De WIA-uitkering is geweigerd op 4 april en de polis biedt geen dekking."
        profile = build_case_matching_profile(
            {
                "description": "Dispute with UWV and an insurer.",
                "legal_domain": "unknown",
                "desired_outcome": "Restore benefits and insurance coverage.",
            },
            documents=[{"title": "UWV decision", "extracted_text": confidential_phrase}],
            claims=[{"statement": "UWV applied the disability threshold incorrectly."}],
            contradictions=[{"title": "Conflicting disability percentage"}],
            deadlines=[{"title": "Deadline for bezwaar"}],
            obligations=[{"title": "Insurer must provide its coverage decision"}],
        )

        self.assertIn("SOCIAL_SECURITY_LAW", profile["inferred_legal_fields"])
        self.assertIn("INSURANCE_LAW", profile["inferred_legal_fields"])
        self.assertEqual(profile["source_coverage"]["documents"], 1)
        self.assertEqual(profile["source_coverage"]["claims"], 1)
        self.assertFalse(profile["privacy"]["raw_case_text_shared"])
        self.assertNotIn(confidential_phrase, str(profile))

    def test_case_intake_uses_the_same_official_taxonomy(self):
        matches = LegalCaseMatcher().match_legal_fields(
            "My employer terminated me after workplace discrimination.",
            num_matches=3,
        )

        self.assertEqual(matches[0]["field_id"], "employment_law")
        self.assertEqual(matches[0]["nova_id"], 14)
        self.assertEqual(len(LegalCaseMatcher().legal_fields), 35)


if __name__ == "__main__":
    unittest.main()
