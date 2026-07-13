"""Official-area taxonomy and local case profiling for Dutch legal matching.

The NOvA finder currently exposes 35 registered primary legal areas. LARO uses
their public names and identifiers as search filters, while all case-content
classification stays local. Raw case text is never included in the public
profile returned by this module.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple


NOVA_LEGAL_AREAS_URL = "https://zoekeenadvocaat.advocatenorde.nl/rechtsgebieden"
NOVA_ADVANCED_SEARCH_URL = "https://zoekeenadvocaat.advocatenorde.nl/zoeken/uitgebreid"


# key, NOvA id, Dutch label, English label, aliases, matching signals, subareas
_RAW_AREAS: Tuple[Tuple[Any, ...], ...] = (
    ("PROCUREMENT_LAW", 34, "Aanbestedingsrecht", "Procurement law",
     ("public procurement law",),
     ("aanbesteding", "overheidsopdracht", "tender", "gunning", "inschrijving", "uitsluiting", "public contract", "procurement"), ()),
    ("AGRICULTURAL_LAW", 78, "Agrarisch recht", "Agricultural law",
     ("agricultural law",),
     ("agrarisch", "landbouw", "veehouderij", "pacht", "boerderij", "agri", "agriculture", "farming"), ()),
    ("CIVIL_SERVICE_LAW", 22, "Ambtenarenrecht", "Civil service law",
     ("public service employment law", "civil servant law"),
     ("ambtenaar", "ambtenaren", "overheidswerkgever", "militair", "rechtspositie ambtenaar", "civil servant", "public employee"), ("Militairen",)),
    ("EMPLOYMENT_LAW", 14, "Arbeidsrecht", "Employment law",
     ("labour law", "labor law", "employment"),
     ("arbeid", "werkgever", "werknemer", "ontslag", "loon", "arbeidsovereenkomst", "discriminatie", "cao", "employee", "employer", "dismissal", "termination", "workplace", "wage"),
     ("Arbeidsmediation", "Collectief ontslag", "Internationaal arbeidsrecht", "Medezeggenschap", "Pensioenen")),
    ("ASYLUM_REFUGEE_LAW", 69, "Asiel- en vluchtelingenrecht", "Asylum and refugee law",
     ("asylum law", "refugee law"),
     ("asiel", "vluchteling", "vluchtelingen", "mensenhandel", "internationale bescherming", "asylum", "refugee"), ("Mensenhandel",)),
    ("TAX_LAW", 48, "Belastingrecht", "Tax law",
     ("taxation law",),
     ("belasting", "belastingdienst", "aanslag", "heffing", "invordering", "btw", "inkomstenbelasting", "toeslag", "tax", "tax assessment"), ()),
    ("ADMINISTRATIVE_LAW", 227, "Bestuursrecht", "Administrative law",
     ("public administrative law",),
     ("bestuursorgaan", "besluit", "bezwaar", "beroep", "overheid", "gemeente", "cak", "uwv", "subsidie", "handhaving", "government decision", "administrative appeal", "public authority"),
     ("Bestuursprocesrecht", "Europees recht", "Handhavingsrecht", "Subsidierecht")),
    ("CIVIL_PROCEDURE_LAW", 200, "Burgerlijk procesrecht", "Civil procedure law",
     ("civil litigation", "civil procedural law"),
     ("civiele procedure", "dagvaarding", "verzoekschrift", "beslag", "executie", "arbitrage", "litigation", "civil claim", "summons"),
     ("Arbitrage", "Beslag- en executierecht", "Litigation")),
    ("CASSATION_LAW", 87, "Cassatie", "Cassation law",
     ("supreme court appeal",),
     ("cassatie", "hoge raad", "cassatieberoep", "cassatieadvocaat", "supreme court", "cassation appeal"), ("Belasting", "Civiel", "Straf")),
    ("ECONOMIC_REGULATION_LAW", 219, "Economisch ordeningsrecht", "Economic regulation law",
     ("competition and regulated markets law",),
     ("mededinging", "energierecht", "telecommunicatie", "marktordening", "acm", "concurrentie"),
     ("Energierecht", "Mededingingsrecht", "Telecommunicatierecht")),
    ("INHERITANCE_LAW", 9, "Erfrecht", "Inheritance law",
     ("succession law", "estate law"),
     ("erfenis", "nalatenschap", "testament", "erfgenaam", "legitieme portie", "executeur", "inheritance", "will", "estate"), ()),
    ("FINANCIAL_LAW", 44, "Financieel recht", "Financial law",
     ("banking and finance law",),
     ("bank", "bankrecht", "belegging", "vermogensbeheer", "financieel product", "krediet", "betaaldienst", "investment", "financial product", "credit"), ("Bankrecht",)),
    ("HEALTH_LAW", 72, "Gezondheidsrecht", "Health law",
     ("medical law", "healthcare law"),
     ("patient", "zorgverlener", "ziekenhuis", "medische behandeling", "zorg", "wkkgz", "medisch dossier", "healthcare", "medical treatment", "hospital"), ()),
    ("PROPERTY_LAW", 24, "Huurrecht", "Tenancy law",
     ("tenancy law", "rental law", "housing law"),
     ("huur", "huurder", "verhuurder", "huurwoning", "woningcorporatie", "sociale huur", "gebrek", "servicekosten", "ontruiming", "tenant", "landlord", "rent", "lease", "eviction"),
     ("Bedrijfsruimte", "Woonruimte")),
    ("INFORMATION_LAW", 238, "Informatierecht", "Information law",
     ("information technology law", "media law"),
     ("informatie", "it recht", "software", "platform", "mediarecht", "publicatie", "internet", "wob", "woo verzoek"),
     ("IT recht", "Mediarecht")),
    ("INSOLVENCY_LAW", 51, "Insolventierecht", "Insolvency law",
     ("bankruptcy law", "debt insolvency law"),
     ("faillissement", "insolventie", "surseance", "wsnp", "schulden", "curator", "schuldeiser", "bankruptcy", "debt", "creditor"),
     ("Faillissement", "Surseance van betaling", "WSNP")),
    ("INTELLECTUAL_PROPERTY_LAW", 198, "Intellectueel eigendomsrecht", "Intellectual property law",
     ("ip law", "copyright and trademark law"),
     ("auteursrecht", "merk", "octrooi", "patent", "inbreuk", "licentie", "software", "handelsnaam", "copyright", "trademark", "infringement"), ()),
    ("PERSONAL_INJURY_LAW", 66, "Letselschaderecht", "Personal injury law",
     ("injury compensation law",),
     ("letselschade", "ongeval", "aansprakelijkheid", "schadevergoeding", "medische schade", "overlijdensschade", "personal injury", "accident", "compensation"), ()),
    ("ENVIRONMENTAL_LAW", 70, "Omgevingsrecht", "Environmental and planning law",
     ("planning law", "environmental planning law"),
     ("omgevingsvergunning", "milieu", "bestemmingsplan", "natuur", "waterrecht", "ruimtelijke ordening", "handhaving"),
     ("Milieurecht", "Natuurbeschermingsrecht", "Ruimtelijk bestuursrecht", "Waterrecht")),
    ("CORPORATE_LAW", 35, "Ondernemingsrecht", "Corporate law",
     ("company law", "business law"),
     ("ondernemingsgeschil", "vennootschap", "bestuurder", "aandeelhouder", "fusie", "overname", "stichting", "vereniging", "corporation", "shareholder", "merger", "director"),
     ("Agentuur en distributie", "Beroepsaansprakelijkheid", "Bestuurdersaansprakelijkheid", "Fusies en overnames", "Vennootschappen", "Verenigingen en stichtingen")),
    ("EDUCATION_LAW", 73, "Onderwijsrecht", "Education law",
     ("school law",),
     ("school", "onderwijs", "leerling", "student", "examen", "studiefinanciering", "toelating", "schorsing", "education", "exam", "admission"), ()),
    ("EXPROPRIATION_LAW", 74, "Onteigeningsrecht", "Expropriation law",
     ("compulsory purchase law",),
     ("onteigening", "algemeen belang", "grondverwerving", "schadeloosstelling"), ()),
    ("FAMILY_LAW", 2, "Personen- en Familierecht", "Family and personal status law",
     ("family law", "personal status law"),
     ("echtscheiding", "alimentatie", "omgang", "gezag", "ouderschap", "erkenning", "kinderbescherming", "voogdij", "divorce", "custody", "child support", "marriage", "guardianship"),
     ("Bijzonder curator", "Collaborative divorce", "Echtscheidingen, alimentatiezaken, omgangsregelingen", "Internationaal privaatrecht", "Internationale kinderontvoering", "Jeugdbeschermingsrecht", "Mediation", "Ouderschap en erkenning")),
    ("PRIVACY_LAW", 237, "Privacy recht", "Privacy and data protection law",
     ("data protection law", "privacyrecht"),
     ("privacy", "avg", "gdpr", "persoonsgegevens", "datalek", "inzageverzoek", "gegevensverwerking", "personal data", "data breach"), ()),
    ("PSYCHIATRIC_PATIENT_LAW", 65, "Psychiatrisch pati\u00ebntenrecht", "Psychiatric patient law",
     ("mental health detention law",),
     ("psychiatrie", "gedwongen opname", "dwangbehandeling", "zorgmachtiging", "crisismaatregel", "wvggz"), ()),
    ("VICTIM_LAW", 223, "Slachtofferrecht", "Victim law",
     ("victims rights law",),
     ("slachtoffer", "misdrijf", "benadeelde partij", "spreekrecht", "schadefonds", "mensenhandel"),
     ("Letselschaderecht", "Mensenhandel", "Strafrecht")),
    ("SOCIAL_SECURITY_LAW", 18, "Sociaal-zekerheidsrecht", "Social security law",
     ("social welfare law", "benefits law"),
     ("uitkering", "bijstand", "sociale zekerheid", "uwv", "svb", "arbeidsongeschikt", "werkloos", "wia", "wajong", "participatiewet", "benefits", "social security", "disability benefit", "unemployment"),
     ("Internationaal (arbeids)recht", "Sociale voorzieningen", "Volksverzekeringen", "Werknemersverzekeringen")),
    ("SPORTS_LAW", 196, "Sportrecht", "Sports law",
     ("sports regulation law",),
     ("sport", "sporter", "sportbond", "doping", "transfer", "tuchtcommissie sport"), ()),
    ("CRIMINAL_LAW", 56, "Strafrecht", "Criminal law",
     ("criminal defence law", "criminal defense law"),
     ("strafbaar", "verdachte", "vervolging", "politie", "officier van justitie", "gevangenis", "strafzaak", "boete", "arrest", "criminal charge", "prosecution", "crime", "sentence"),
     ("Financieel economisch strafrecht", "Fiscaal strafrecht", "Internationaal Strafrecht", "Jeugdstrafrecht", "Milieu strafrecht", "Militair strafrecht", "Penitentiair recht", "TBS", "Uit- en overleveringszaken", "Vreemdelingen(straf)recht")),
    ("TRANSPORT_TRADE_LAW", 204, "Transport- en handelsrecht", "Transport and trade law",
     ("transport law", "trade law"),
     ("transport", "vervoer", "goederen", "scheepvaart", "luchtvaart", "spoor", "handelsrecht", "cargolading"), ()),
    ("DISCIPLINARY_LAW", 80, "Tuchtrecht", "Disciplinary law",
     ("professional discipline law",),
     ("tucht", "tuchtklacht", "beroepsfout", "deken", "tuchtcollege", "notaris", "accountant", "deurwaarder"),
     ("Advocatentuchtrecht", "Deurwaarderstuchtrecht", "Makelaardij tuchtrecht", "Medisch tuchtrecht", "Militair tuchtrecht", "Tuchtrecht notarissen, accountants en belastingadviseurs")),
    ("REAL_ESTATE_LAW", 232, "Vastgoedrecht", "Real estate law",
     ("property development law",),
     ("vastgoed", "onroerend goed", "bouwrecht", "burenrecht", "erfdienstbaarheid", "erfpacht", "projectontwikkeling"),
     ("Bouwrecht", "Burenrecht", "Erfdienstbaarheden", "Erfpacht")),
    ("CONTRACT_LAW", 197, "Verbintenissenrecht", "Contract and obligations law",
     ("contract law", "obligations law", "consumer contract law"),
     ("overeenkomst", "contract", "nakoming", "wanprestatie", "ontbinding", "aansprakelijkheid", "schade", "consument", "breach of contract", "consumer", "performance"),
     ("Agentuur en distributie",)),
    ("INSURANCE_LAW", 205, "Verzekeringsrecht", "Insurance law",
     ("insurance coverage law",),
     ("verzekering", "verzekeraar", "polis", "dekking", "premie", "schadeclaim", "zorgverzekering", "insurance", "insurer", "coverage", "policy"), ()),
    ("IMMIGRATION_LAW", 68, "Vreemdelingenrecht", "Immigration law",
     ("migration law", "foreign nationals law"),
     ("verblijfsvergunning", "vreemdeling", "immigratie", "naturalisatie", "inreisverbod", "uitzetting", "ind", "visa", "citizenship", "deportation", "residence permit"),
     ("Vreemdelingenbewaring",)),
)


def _fold(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def _key(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", _fold(value).upper()).strip("_")


def _area(row: Tuple[Any, ...]) -> Dict[str, Any]:
    key, nova_id, name_nl, label_en, aliases, keywords, subareas = row
    return {
        "key": key,
        "nova_id": nova_id,
        "name_nl": name_nl,
        "label_en": label_en,
        "aliases": tuple(aliases),
        "keywords": tuple(keywords),
        "subareas": tuple(subareas),
    }


DUTCH_LEGAL_AREAS: Tuple[Dict[str, Any], ...] = tuple(_area(row) for row in _RAW_AREAS)
_AREA_BY_KEY = {area["key"]: area for area in DUTCH_LEGAL_AREAS}

_LEGACY_ALIASES = {
    "TENANCY_LAW": "PROPERTY_LAW",
    "HOUSING_LAW": "PROPERTY_LAW",
    "RENTAL_LAW": "PROPERTY_LAW",
    "HUURRECHT": "PROPERTY_LAW",
    "CONSUMER_LAW": "CONTRACT_LAW",
    "DEBT_COLLECTION": "INSOLVENCY_LAW",
    "LABOUR_LAW": "EMPLOYMENT_LAW",
    "PERSONEN_EN_FAMILIERECHT": "FAMILY_LAW",
    "INTELLECTUAL_PROPERTY": "INTELLECTUAL_PROPERTY_LAW",
    "MEDICAL_LAW": "HEALTH_LAW",
    "DATA_PROTECTION_LAW": "PRIVACY_LAW",
    "BENEFITS_LAW": "SOCIAL_SECURITY_LAW",
}

_ALIAS_TO_KEY: Dict[str, str] = {}
for _item in DUTCH_LEGAL_AREAS:
    for _alias in (_item["key"], _item["name_nl"], _item["label_en"], *_item["aliases"]):
        _ALIAS_TO_KEY[_key(_alias)] = _item["key"]
_ALIAS_TO_KEY.update(_LEGACY_ALIASES)


def normalize_legal_field(value: Any) -> str:
    if isinstance(value, Mapping):
        value = value.get("field_id") or value.get("key") or value.get("id") or value.get("field_name") or value.get("name")
    normalized = _key(value)
    return _ALIAS_TO_KEY.get(normalized, normalized)


def normalize_legal_fields(values: Any) -> List[str]:
    if not values:
        return []
    if isinstance(values, (str, Mapping)):
        values = [values]
    result: List[str] = []
    for value in values:
        normalized = normalize_legal_field(value)
        if normalized and normalized not in result:
            result.append(normalized)
    return result


def legal_area(key: Any) -> Dict[str, Any] | None:
    return _AREA_BY_KEY.get(normalize_legal_field(key))


def legal_field_ids() -> Dict[str, int]:
    return {area["key"]: int(area["nova_id"]) for area in DUTCH_LEGAL_AREAS}


def legal_field_terms(fields: Sequence[Any]) -> List[str]:
    terms: List[str] = []
    for field in normalize_legal_fields(fields):
        area = _AREA_BY_KEY.get(field)
        if not area:
            continue
        for term in (area["name_nl"], *area["subareas"]):
            if term and term.casefold() not in {item.casefold() for item in terms}:
                terms.append(term)
    return terms


def infer_legal_area_matches(
    text: Any,
    evidence_topics: Sequence[Any] | None = None,
    *,
    limit: int = 4,
) -> List[Dict[str, Any]]:
    haystack = _fold(" ".join([str(text or ""), " ".join(str(item) for item in (evidence_topics or []))]))
    if not haystack:
        return []

    matches: List[Dict[str, Any]] = []
    for area in DUTCH_LEGAL_AREAS:
        weighted_signals: List[Tuple[str, int]] = [
            (area["name_nl"], 7),
            (area["label_en"], 6),
            *((alias, 5) for alias in area["aliases"]),
            *((subarea, 4) for subarea in area["subareas"]),
            *((keyword, 2) for keyword in area["keywords"]),
        ]
        score = 0
        matched_terms: List[str] = []
        for signal, weight in weighted_signals:
            folded = _fold(signal)
            if len(folded) < 3 or not re.search(rf"(?:^| ){re.escape(folded)}(?: |$)", haystack):
                continue
            if folded not in {_fold(item) for item in matched_terms}:
                matched_terms.append(signal)
                score += weight
        if score:
            matches.append({
                "key": area["key"],
                "nova_id": area["nova_id"],
                "name_nl": area["name_nl"],
                "label_en": area["label_en"],
                "score": score,
                "confidence": round(min(0.98, 0.3 + (score / 24.0)), 3),
                "matched_terms": matched_terms[:8],
            })
    matches.sort(key=lambda item: (-item["score"], item["name_nl"].casefold()))
    return matches[: max(1, min(int(limit or 4), 4))]


def infer_legal_fields(text: Any, evidence_topics: Sequence[Any] | None = None, limit: int = 4) -> List[str]:
    return [item["key"] for item in infer_legal_area_matches(text, evidence_topics, limit=limit)]


def _flatten_strings(value: Any, *, limit: int = 80) -> List[str]:
    result: List[str] = []

    def visit(item: Any) -> None:
        if len(result) >= limit or item is None:
            return
        if isinstance(item, str):
            text = item.strip()
            if text:
                result.append(text)
            return
        if isinstance(item, Mapping):
            for nested in item.values():
                visit(nested)
            return
        if isinstance(item, Iterable) and not isinstance(item, (bytes, bytearray)):
            for nested in item:
                visit(nested)

    visit(value)
    return result


def build_case_matching_profile(
    case: Mapping[str, Any] | None,
    *,
    documents: Sequence[Mapping[str, Any]] | None = None,
    claims: Sequence[Mapping[str, Any]] | None = None,
    contradictions: Sequence[Mapping[str, Any]] | None = None,
    deadlines: Sequence[Mapping[str, Any]] | None = None,
    obligations: Sequence[Mapping[str, Any]] | None = None,
) -> Dict[str, Any]:
    case = case or {}
    documents = list(documents or [])
    claims = list(claims or [])
    contradictions = list(contradictions or [])
    deadlines = list(deadlines or [])
    obligations = list(obligations or [])

    fragments: List[str] = []
    fragments.extend(_flatten_strings({
        "description": case.get("description"),
        "summary": case.get("current_summary"),
        "desired_outcome": case.get("desired_outcome"),
        "legal_domain": case.get("legal_domain"),
        "institution": case.get("court_or_institution"),
        "opposing_parties": case.get("opposing_parties"),
        "parties": case.get("parties"),
    }))
    for document in documents[:50]:
        fragments.extend(_flatten_strings({
            "title": document.get("title") or document.get("original_filename"),
            "summary": document.get("summary"),
            "extracted_text": str(document.get("extracted_text") or document.get("ocr_text") or "")[:6000],
            "document_type": document.get("document_type"),
            "sender": document.get("sender"),
            "recipient": document.get("recipient"),
            "analysis": (document.get("metadata") or {}).get("legal_analysis"),
        }, limit=24))
    for collection in (claims[:60], contradictions[:30], deadlines[:30], obligations[:30]):
        fragments.extend(_flatten_strings(collection, limit=80))

    local_text = "\n".join(fragments)[:50000]
    matches = infer_legal_area_matches(local_text, limit=4)
    evidence_topics: List[str] = []
    for match in matches:
        for term in (match["name_nl"], *match["matched_terms"]):
            if term and term.casefold() not in {item.casefold() for item in evidence_topics}:
                evidence_topics.append(term)

    coverage = {
        "case": 1 if case else 0,
        "documents": len(documents),
        "claims": len(claims),
        "contradictions": len(contradictions),
        "deadlines": len(deadlines),
        "obligations": len(obligations),
    }
    return {
        "inferred_legal_fields": [item["key"] for item in matches],
        "legal_area_matches": matches,
        "evidence_topics": evidence_topics[:24],
        "source_coverage": coverage,
        "source_items_considered": sum(coverage.values()),
        "privacy": {
            "classification_location": "local",
            "external_directory_receives": ["official legal-area ids", "location and radius when provided", "optional lawyer name"],
            "raw_case_text_shared": False,
        },
    }


def public_taxonomy() -> Dict[str, Any]:
    return {
        "source": "Nederlandse orde van advocaten (NOvA)",
        "source_url": NOVA_LEGAL_AREAS_URL,
        "advanced_search_url": NOVA_ADVANCED_SEARCH_URL,
        "registered_area_count": len(DUTCH_LEGAL_AREAS),
        "areas": [
            {
                "key": area["key"],
                "nova_id": area["nova_id"],
                "name_nl": area["name_nl"],
                "label_en": area["label_en"],
                "subareas": list(area["subareas"]),
            }
            for area in DUTCH_LEGAL_AREAS
        ],
    }
