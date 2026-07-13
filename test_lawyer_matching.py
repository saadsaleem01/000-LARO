import unittest
from unittest.mock import patch

from lawyer_matching import LawyerMatchingEngine, NovaDirectoryClient, NovaSearchCriteria
from lawyer_outreach import LawyerOutreachSystem
from serverless_functions import match_lawyers


TEST_LAWYERS = [
    {
        "lawyer_id": "fixture-admin",
        "name": "Fixture Administrative Lawyer",
        "city": "Amsterdam",
        "distance_km": 6,
        "legal_fields": ["ADMINISTRATIVE_LAW"],
        "nova_rechtsgebieden": ["bestuursrecht", "bezwaar", "beroep"],
        "specialization_associations": ["VAR"],
        "financed_legal_aid": True,
    },
    {
        "lawyer_id": "fixture-employment",
        "name": "Fixture Employment Lawyer",
        "city": "Amsterdam",
        "distance_km": 8,
        "legal_fields": ["EMPLOYMENT_LAW"],
        "nova_rechtsgebieden": ["arbeidsrecht", "ontslag"],
        "specialization_associations": ["VAAN"],
        "financed_legal_aid": True,
    },
]


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def public_result_html(identifier, legal_area="Huurrecht", distance="0.8 km", association="Geen"):
    return f'''
    <div class="result advocaten">
        <div class="heading flex-container">
            <a href="/advocaten/utrecht/mr-fixture-{identifier}/{identifier}">mr. Fixture {identifier}</a>
            <a href="/kantoren/utrecht/fixture-legal/456" class="secondary"><strong>Fixture Legal</strong></a>
            <strong>UTRECHT</strong>
            <span class="label dark-gray no-margin-bottom align-right">{distance}</span>
        </div>
        <div class="jurisdictions"><span class="label dark-gray">{legal_area}</span></div>
        <div class="specialisations"><li>{association}</li></div>
    </div>
    '''


class TestLawyerMatching(unittest.TestCase):
    def test_public_directory_results_keep_source_provenance(self):
        html = '''
        <div class="result advocaten">
            <div class="heading flex-container">
                <a href="/advocaten/amsterdam/mr-fixture/123">mr. Fixture</a>
                <a href="/kantoren/amsterdam/fixture-legal/456" class="secondary"><strong>Fixture Legal</strong></a>
                <strong>AMSTERDAM</strong>
            </div>
            <div class="jurisdictions"><span class="label dark-gray">Bestuursrecht</span></div>
            <div class="specialisations"><li>Fixture Association</li></div>
        </div>
        '''

        with patch("lawyer_matching.requests.get", return_value=FakeResponse({"count": 1, "html": html})) as get:
            result = LawyerMatchingEngine().match({"legal_fields": ["ADMINISTRATIVE_LAW"], "max_results": 3})

        self.assertEqual(result["source_mode"], "nova_public_directory")
        self.assertEqual(result["source_details"]["reported_total"], 1)
        self.assertEqual(result["matched_lawyers"][0]["profile_url"], "https://zoekeenadvocaat.advocatenorde.nl/advocaten/amsterdam/mr-fixture/123")
        self.assertIsNone(result["matched_lawyers"][0]["response_rate"])
        self.assertIn("filters%5Brechtsgebieden%5D=%5B227%5D", get.call_args.args[0])
        self.assertNotIn("filters%5Bspecialisatie%5D", get.call_args.args[0])

    def test_nova_search_url_uses_official_filter_names(self):
        client = NovaDirectoryClient()
        criteria = NovaSearchCriteria(
            legal_fields=["EMPLOYMENT_LAW"],
            postcode_or_city="Amsterdam",
            radius_km=50,
            requires_financed_legal_aid=True,
            prefer_specialization_association=True,
            require_specialization_association=True,
            lawyer_name="Jansen",
            nova_specialization_ids=[6],
            resolved_location={
                "title": "Amsterdam",
                "lat": "52.3676",
                "lng": "4.9041",
                "hash": "official-location-token",
            },
        )

        url = client.build_search_url(criteria)

        self.assertIn("https://zoekeenadvocaat.advocatenorde.nl/zoeken", url)
        self.assertIn("filters%5Brechtsgebieden%5D=", url)
        self.assertIn("locatie%5Badres%5D=Amsterdam", url)
        self.assertIn("locatie%5Bgeo%5D%5Blat%5D=52.3676", url)
        self.assertIn("locatie%5Bgeo%5D%5Blng%5D=4.9041", url)
        self.assertIn("locatie%5Bhash%5D=official-location-token", url)
        self.assertIn("locatie%5Bstraal%5D=50", url)
        self.assertIn("filters%5Btoevoegingen%5D=1", url)
        self.assertIn("q=Jansen", url)
        self.assertIn("filters%5Bspecialisatieverenigingen%5D=%5B6%5D", url)
        self.assertNotIn("filters%5Bspecialisatie%5D", url)

    def test_live_directory_applies_location_radius_and_paginates_without_duplicates(self):
        first_page = "".join(public_result_html(index, distance=f"{index / 10:.1f} km") for index in range(1, 11))
        second_page = public_result_html(11, distance="1.1 km", association="VHA")

        def fake_get(url, **kwargs):
            if url.endswith("/api/autocomplete/cities"):
                self.assertEqual(kwargs["params"]["filter"], "Utrecht")
                return FakeResponse([{
                    "title": "Utrecht",
                    "hash": "a7e95542fe6c4cc634c9d25bce7a5d58",
                    "lat": "52.0907374",
                    "lng": "5.1214201",
                }])
            if "pagina=1" in url:
                return FakeResponse({"count": 11, "html": first_page})
            if "pagina=2" in url:
                return FakeResponse({"count": 11, "html": second_page})
            raise AssertionError(f"Unexpected NOvA request: {url}")

        with patch("lawyer_matching.requests.get", side_effect=fake_get) as get:
            result = LawyerMatchingEngine().match({
                "legal_fields": ["PROPERTY_LAW"],
                "postcode_or_city": "Utrecht",
                "radius_km": 25,
                "max_results": 20,
            })

        fetch_urls = [call.args[0] for call in get.call_args_list if "/zoeken/fetch" in call.args[0]]
        self.assertEqual(len(fetch_urls), 2)
        self.assertIn("locatie%5Bgeo%5D%5Blat%5D=52.0907374", fetch_urls[0])
        self.assertIn("locatie%5Bhash%5D=a7e95542fe6c4cc634c9d25bce7a5d58", fetch_urls[0])
        self.assertIn("locatie%5Bstraal%5D=25", fetch_urls[0])
        self.assertIn("pagina=2", fetch_urls[1])
        self.assertEqual(result["available_count"], 11)
        self.assertEqual(result["source_details"]["reported_total"], 11)
        self.assertEqual(result["source_details"]["pages_fetched"], 2)
        self.assertTrue(result["source_details"]["location_filter_applied"])
        candidates_by_id = {candidate["id"]: candidate for candidate in result["matched_lawyers"]}
        self.assertEqual(candidates_by_id["1"]["distance_km"], 0.1)

    def test_required_specialization_uses_relevant_official_association_ids(self):
        html = public_result_html(1, association="Vereniging van Huurrecht Advocaten (VHA)")

        def fake_get(url, **kwargs):
            if url.endswith("/api/search/specialisations"):
                self.assertEqual(kwargs["params"]["rechtsgebieden"], "[24]")
                return FakeResponse([6])
            if "/zoeken/fetch" in url:
                return FakeResponse({"count": 1, "html": html})
            raise AssertionError(f"Unexpected NOvA request: {url}")

        with patch("lawyer_matching.requests.get", side_effect=fake_get) as get:
            result = LawyerMatchingEngine().match({
                "legal_fields": ["PROPERTY_LAW"],
                "require_specialization_association": True,
                "max_results": 10,
            })

        fetch_url = next(call.args[0] for call in get.call_args_list if "/zoeken/fetch" in call.args[0])
        self.assertIn("filters%5Bspecialisatieverenigingen%5D=%5B6%5D", fetch_url)
        self.assertTrue(result["source_details"]["specialization_filter_applied"])
        self.assertEqual(result["source_details"]["official_specialization_ids"], [6])

    def test_social_security_case_uses_the_official_registered_area(self):
        html = public_result_html(18, legal_area="Sociaal-zekerheidsrecht")

        with patch("lawyer_matching.requests.get", return_value=FakeResponse({"count": 1, "html": html})) as get:
            result = LawyerMatchingEngine().match({
                "description": "UWV heeft de WIA-uitkering geweigerd.",
                "legal_fields": ["SOCIAL_SECURITY_LAW"],
                "max_results": 10,
            })

        fetch_url = next(call.args[0] for call in get.call_args_list if "/zoeken/fetch" in call.args[0])
        self.assertIn("filters%5Brechtsgebieden%5D=%5B18%5D", fetch_url)
        self.assertEqual(result["search_criteria"]["legal_fields"][0], "SOCIAL_SECURITY_LAW")
        self.assertEqual(result["matched_lawyers"][0]["legal_fields"], ["SOCIAL_SECURITY_LAW"])

    def test_multidomain_case_queries_each_official_area_and_unions_results(self):
        social_html = public_result_html(18, legal_area="Sociaal-zekerheidsrecht")
        insurance_html = public_result_html(205, legal_area="Verzekeringsrecht")
        administrative_html = public_result_html(227, legal_area="Bestuursrecht")

        def fake_get(url, **kwargs):
            if "%5B18%5D" in url:
                return FakeResponse({"count": 482, "html": social_html})
            if "%5B205%5D" in url:
                return FakeResponse({"count": 117, "html": insurance_html})
            if "%5B227%5D" in url:
                return FakeResponse({"count": 1234, "html": administrative_html})
            raise AssertionError(f"Unexpected NOvA request: {url}")

        with patch("lawyer_matching.requests.get", side_effect=fake_get) as get:
            result = LawyerMatchingEngine().match({
                "description": "UWV rejected the WIA benefit and the insurance company refused policy coverage.",
                "max_results": 20,
            })

        fetch_urls = [call.args[0] for call in get.call_args_list]
        self.assertEqual(len(fetch_urls), 3)
        self.assertFalse(any("%5B18%2C205%5D" in url or "%5B205%2C18%5D" in url for url in fetch_urls))
        self.assertEqual({item["id"] for item in result["matched_lawyers"]}, {"18", "205", "227"})
        self.assertEqual(result["source_details"]["multi_area_strategy"], "separate_official_queries_then_local_deduplication")
        self.assertNotIn("CORPORATE_LAW", result["search_criteria"]["legal_fields"])

    def test_directory_window_is_reported_as_partial_when_more_official_results_exist(self):
        def page_html(page):
            start = ((page - 1) * 10) + 1
            return "".join(public_result_html(index) for index in range(start, start + 10))

        def fake_get(url, **kwargs):
            page = 2 if "pagina=2" in url else 1
            return FakeResponse({"count": 200, "html": page_html(page)})

        with patch("lawyer_matching.requests.get", side_effect=fake_get):
            result = LawyerMatchingEngine().match({
                "legal_fields": ["PROPERTY_LAW"],
                "max_results": 20,
            })

        self.assertEqual(result["source_details"]["pages_fetched"], 2)
        self.assertEqual(result["source_details"]["unique_candidate_count"], 20)
        self.assertTrue(result["source_details"]["partial_results"])
        self.assertEqual(result["source_details"]["reported_total"], 200)

    def test_unresolved_location_is_reported_and_not_silently_applied(self):
        html = public_result_html(1)

        def fake_get(url, **kwargs):
            if url.endswith("/api/autocomplete/cities"):
                return FakeResponse([])
            if "/zoeken/fetch" in url:
                return FakeResponse({"count": 1, "html": html})
            raise AssertionError(f"Unexpected NOvA request: {url}")

        with patch("lawyer_matching.requests.get", side_effect=fake_get) as get:
            result = LawyerMatchingEngine().match({
                "legal_fields": ["PROPERTY_LAW"],
                "postcode_or_city": "Unknown place",
                "radius_km": 25,
                "max_results": 10,
            })

        fetch_url = next(call.args[0] for call in get.call_args_list if "/zoeken/fetch" in call.args[0])
        self.assertNotIn("locatie%5B", fetch_url)
        self.assertFalse(result["source_details"]["location_filter_applied"])
        self.assertIn("location", result["source_details"]["filters_unresolved"])
        self.assertIn("no radius filter was applied", result["source_details"]["location_filter_note"])

    def test_engine_ranks_matching_legal_area_and_location_first(self):
        engine = LawyerMatchingEngine()

        result = engine.match({
            "description": "CAK besluit, bezwaar en beroep over onjuiste toepassing.",
            "legal_fields": ["ADMINISTRATIVE_LAW"],
            "postcode_or_city": "Amsterdam",
            "radius_km": 50,
            "requires_financed_legal_aid": True,
            "evidence_topics": ["CAK", "bezwaar", "bestuursorgaan"],
        }, records=TEST_LAWYERS)

        self.assertGreaterEqual(result["result_count"], 1)
        first = result["matched_lawyers"][0]
        self.assertIn("ADMINISTRATIVE_LAW", first["legal_fields"])
        self.assertGreater(first["match_score"], 70)
        self.assertTrue(first["match_reasons"])
        self.assertIn("nova_search_url", first)

    def test_national_radius_does_not_exclude_distant_official_results(self):
        distant = {
            **TEST_LAWYERS[0],
            "lawyer_id": "fixture-national",
            "id": "fixture-national",
            "distance_km": 140,
        }

        result = LawyerMatchingEngine().match({
            "legal_fields": ["ADMINISTRATIVE_LAW"],
            "postcode_or_city": "Amsterdam",
            "radius_km": 56,
        }, records=[distant])

        self.assertEqual(result["result_count"], 1)
        self.assertTrue(result["matched_lawyers"][0]["filter_hits"]["within_radius"])

    def test_serverless_match_lawyers_returns_metadata(self):
        result = match_lawyers({
            "case_id": 77,
            "case_data": {
                "description": "Werkgever heeft werknemer zonder dossier ontslagen.",
                "legal_fields": ["EMPLOYMENT_LAW"],
                "postcode_or_city": "Amsterdam",
                "radius_km": 50,
                "requires_financed_legal_aid": True,
            },
            "max_results": 5,
            "candidate_lawyers": TEST_LAWYERS,
        }, {})

        self.assertEqual(result["statusCode"], 200)
        body = result["body"]
        self.assertIn("matched_lawyers", body)
        self.assertIn("search_criteria", body)
        self.assertIn("nova_search_url", body)
        self.assertGreaterEqual(len(body["matched_lawyers"]), 1)

    def test_outreach_accepts_preferred_matches_and_limit(self):
        outreach = LawyerOutreachSystem(case_id=101, user_id=202)
        matches = LawyerMatchingEngine().match({
            "legal_fields": ["EMPLOYMENT_LAW"],
            "postcode_or_city": "Amsterdam",
            "radius_km": 50,
        }, records=TEST_LAWYERS)["matched_lawyers"]

        records = outreach.send_initial_outreach(
            "Employee was dismissed without a proper file.",
            "EMPLOYMENT_LAW",
            max_lawyers=1,
            preferred_lawyers=[matches[0]["id"]],
            match_criteria={
                "postcode_or_city": "Amsterdam",
                "radius_km": 50,
                "candidate_lawyers": TEST_LAWYERS,
            },
        )

        self.assertEqual(len(records), 1)
        self.assertEqual(str(records[0]["lawyer_id"]), str(matches[0]["lawyer_id"]))


if __name__ == "__main__":
    unittest.main()
