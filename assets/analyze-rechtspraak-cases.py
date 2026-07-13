#!/usr/bin/env python3
"""
NLP Pipeline: Analyze Rechtspraak.nl Court Cases
Builds comprehensive keyword corpus for 36 Dutch legal areas
"""

import requests
import xml.etree.ElementTree as ET
import json
import time
from collections import defaultdict, Counter
from typing import List, Dict, Set
import re
from datetime import datetime, timedelta

# Map Nederlandse Orde van Advocaten legal areas to Rechtspraak.nl rechtsgebieden
# Source: https://www.advocatenorde.nl/document/bijlage-9-lijst-van-rechtsgebieden
LEGAL_AREA_MAPPING = {
    "Personen- en Familierecht": ["Personen- en familierecht"],
    "Erfrecht": ["Erfrecht"],
    "Arbeidsrecht": ["Arbeidsrecht"],
    "Sociaal zekerheidsrecht": ["Socialezekerheidsrecht"],
    "Ambtenarenrecht": ["Ambtenarenrecht"],
    "Huurrecht": ["Huurrecht"],
    "Verbintenissenrecht": ["Verbintenissenrecht", "Overeenkomst"],
    "Intellectueel eigendomsrecht": ["Intellectueel-eigendomsrecht"],
    "Ondernemingsrecht": ["Ondernemingsrecht"],
    "Burgerlijk procesrecht": ["Civiel recht"],
    "Transport- en handelsrecht": ["Vervoersrecht"],
    "Financieel recht": ["Financieel recht"],
    "Verzekeringsrecht": ["Verzekeringsrecht"],
    "Belastingrecht": ["Belastingrecht"],
    "Privacy recht": ["Privacyrecht"],
    "Informatierecht": ["Informatierecht"],
    "Insolventierecht": ["Insolventierecht"],
    "Strafrecht": ["Strafrecht"],
    "Letselschaderecht": ["Letselschade"],
    "Bestuursrecht": ["Bestuursrecht"],
    "Vreemdelingenrecht": ["Vreemdelingenrecht"],
    "Asiel- en vluchtelingenrecht": ["Vreemdelingenrecht"],
    "Omgevingsrecht": ["Omgevingsrecht"],
    "Gezondheidsrecht": ["Gezondheidsrecht"],
    "Onderwijsrecht": ["Onderwijsrecht"],
    "Vastgoedrecht": ["Goederenrecht"],
}

API_BASE = "https://data.rechtspraak.nl/uitspraken/zoeken"
RATE_LIMIT = 0.15  # 10 requests per second = 0.1s between requests (add buffer)

class RechtspraakScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (LARO Legal Area Research Bot)',
            'Accept': 'application/xml'
        })
        
    def fetch_cases_by_legal_area(self, rechtsgebied: str, max_cases: int = 500) -> List[Dict]:
        """Fetch cases for a specific legal area"""
        cases = []
        
        # Calculate date range (last 2 years for recent cases)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)
        
        params = {
            'rechtsgebieden': rechtsgebied,
            'date_from': start_date.strftime('%Y-%m-%d'),
            'date_to': end_date.strftime('%Y-%m-%d'),
            'max': min(max_cases, 1000),  # API limit
            'return': 'DOC'  # Return full documents
        }
        
        print(f"Fetching cases for {rechtsgebied}...")
        
        try:
            response = self.session.get(API_BASE, params=params, timeout=30)
            time.sleep(RATE_LIMIT)
            
            if response.status_code != 200:
                print(f"  Error: HTTP {response.status_code}")
                return cases
            
            # Parse XML response
            root = ET.fromstring(response.content)
            
            # Extract case summaries from feed
            for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry'):
                case_data = self._extract_case_data(entry)
                if case_data and case_data.get('summary'):
                    cases.append(case_data)
                    
            print(f"  Found {len(cases)} cases")
            
        except Exception as e:
            print(f"  Error fetching cases: {e}")
            
        return cases[:max_cases]
    
    def _extract_case_data(self, entry_element) -> Dict:
        """Extract relevant data from XML entry element"""
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        try:
            ecli = entry_element.find('.//atom:id', ns)
            title = entry_element.find('.//atom:title', ns)
            summary = entry_element.find('.//atom:summary', ns)
            updated = entry_element.find('.//atom:updated', ns)
            
            return {
                'ecli': ecli.text if ecli is not None else None,
                'title': title.text if title is not None else '',
                'summary': summary.text if summary is not None else '',
                'date': updated.text if updated is not None else '',
            }
        except Exception as e:
            print(f"  Error extracting case data: {e}")
            return {}

class KeywordExtractor:
    def __init__(self):
        # Dutch stopwords
        self.stopwords = set([
            'de', 'het', 'een', 'en', 'van', 'in', 'op', 'te', 'voor', 'is', 'aan', 'dat',
            'met', 'zijn', 'als', 'heeft', 'wordt', 'door', 'bij', 'ook', 'naar', 'om',
            'deze', 'niet', 'tot', 'kan', 'meer', 'dan', 'uit', 'er', 'over', 'worden',
            'maar', 'of', 'hebben', 'dit', 'zijn', 'was', 'al', 'nog', 'geen', 'tegen',
            'onder', 'tussen', 'na', 'omdat', 'zoals', 'wel', 'alleen', 'zonder', 'zo',
            'zeer', 'moet', 'kunnen', 'echter', 'dus', 'reeds', 'aldus', 'immers'
        ])
        
        # Procedural/court terms to filter out
        self.procedural_terms = set([
            'ecli', 'gharn', 'gerechtshof', 'rechtbank', 'raad', 'hoge', 'rbarn', 'rbzwo',
            'rbutr', 'rbalm', 'rbshe', 'rbsgr', 'rbrot', 'rbams', 'rbdha', 'rbmne', 'rbnho',
            'arnhem', 'zwolle', 'utrecht', 'almelo', "'s-hertogenbosch", "'s-gravenhage",
            'rotterdam', 'amsterdam', 'hague', 'leeuwarden', 'groningen', 'maastricht',
            'eiser', 'eiseres', 'verweerder', 'verweerster', 'appellant', 'geïntimeerde',
            'januari', 'februari', 'maart', 'april', 'juni', 'juli', 'augustus',
            'september', 'oktober', 'november', 'december',
            'ingevolge', 'ingang', 'artikel', 'artikelen', 'lid', 'leden',
            'beslissing', 'uitspraak', 'vonnis', 'arrest', 'beschikking',
            'procedure', 'proceskosten', 'griffierecht', 'zitting',
            'partij', 'partijen', 'zaak', 'zaken', 'nummer', 'nummers',
            'datum', 'datum', 'jaar', 'jaren', 'maand', 'maanden', 'week', 'weken'
        ])
        
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        # Lowercase and tokenize
        text = text.lower()
        
        # Remove special characters but keep hyphens and apostrophes
        text = re.sub(r'[^a-zà-ÿ\s\-\']', ' ', text)
        
        # Split into words
        words = text.split()
        
        # Filter stopwords, procedural terms, and short words
        keywords = [
            w for w in words 
            if len(w) > 3 
            and w not in self.stopwords 
            and w not in self.procedural_terms
        ]
        
        return keywords
    
    def calculate_tfidf(self, documents_by_area: Dict[str, List[str]]) -> Dict[str, List[tuple]]:
        """Calculate TF-IDF scores for keywords per legal area"""
        from math import log
        
        # Calculate document frequency across all areas
        df = Counter()
        total_docs = 0
        
        for area, docs in documents_by_area.items():
            total_docs += len(docs)
            area_words = set()
            for doc in docs:
                area_words.update(self.extract_keywords(doc))
            df.update(area_words)
        
        # Calculate TF-IDF per area
        tfidf_by_area = {}
        
        for area, docs in documents_by_area.items():
            # Calculate term frequency in this area
            tf = Counter()
            for doc in docs:
                tf.update(self.extract_keywords(doc))
            
            # Calculate TF-IDF scores
            tfidf_scores = {}
            for term, freq in tf.items():
                tf_score = freq / len(docs)  # Normalize by document count
                idf_score = log(total_docs / (df[term] + 1))  # +1 to avoid division by zero
                tfidf_scores[term] = tf_score * idf_score
            
            # Sort by score and take top keywords
            sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
            tfidf_by_area[area] = sorted_keywords[:100]  # Top 100 keywords
        
        return tfidf_by_area

def main():
    print("="*80)
    print("RECHTSPRAAK.NL NLP PIPELINE")
    print("Analyzing Dutch court cases to build legal keyword corpus")
    print("="*80)
    print()
    
    scraper = RechtspraakScraper()
    extractor = KeywordExtractor()
    
    # Collect cases for each legal area
    all_cases = {}
    documents_by_area = {}
    
    for noa_area, rechtspraak_areas in LEGAL_AREA_MAPPING.items():
        print(f"\n{'='*80}")
        print(f"Processing: {noa_area}")
        print(f"{'='*80}")
        
        area_cases = []
        area_documents = []
        
        for rechtsgebied in rechtspraak_areas:
            cases = scraper.fetch_cases_by_legal_area(rechtsgebied, max_cases=200)
            area_cases.extend(cases)
            area_documents.extend([c['summary'] + ' ' + c['title'] for c in cases if c.get('summary')])
        
        all_cases[noa_area] = area_cases
        documents_by_area[noa_area] = area_documents
        
        print(f"Total cases collected for {noa_area}: {len(area_cases)}")
        time.sleep(1)  # Be nice to the API
    
    # Calculate TF-IDF keywords
    print(f"\n{'='*80}")
    print("Calculating TF-IDF keyword scores...")
    print(f"{'='*80}")
    
    tfidf_keywords = extractor.calculate_tfidf(documents_by_area)
    
    # Save results
    output_file = '/home/ubuntu/lawyer-automation-dashboard/docs/rechtspraak-keywords-analysis.json'
    
    results = {
        'generated_at': datetime.now().isoformat(),
        'total_areas': len(all_cases),
        'total_cases': sum(len(cases) for cases in all_cases.values()),
        'keywords_by_area': {
            area: {
                'case_count': len(all_cases[area]),
                'top_keywords': [
                    {'keyword': kw, 'tfidf_score': round(score, 4)}
                    for kw, score in keywords[:50]  # Top 50 per area
                ]
            }
            for area, keywords in tfidf_keywords.items()
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*80}")
    print(f"✅ Analysis complete!")
    print(f"Results saved to: {output_file}")
    print(f"Total legal areas analyzed: {results['total_areas']}")
    print(f"Total cases processed: {results['total_cases']}")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()

