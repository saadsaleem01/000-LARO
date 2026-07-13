#!/usr/bin/env python3
"""
Full-Scale NLP Pipeline: Analyze ALL Rechtspraak.nl Cases
Target: 876,422 published rulings for maximum keyword precision
"""

import requests
import xml.etree.ElementTree as ET
import json
import time
import os
from collections import defaultdict, Counter
from typing import List, Dict, Set
import re
from datetime import datetime, timedelta

# Map Nederlandse Orde van Advocaten legal areas to Rechtspraak.nl rechtsgebieden
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
RATE_LIMIT = 0.12  # 10 requests per second with buffer
CHECKPOINT_DIR = "/home/ubuntu/lawyer-automation-dashboard/data/rechtspraak-checkpoints"
BATCH_SIZE = 1000  # API max per request

class FullScaleScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (LARO Legal Research Bot - Full Analysis)',
            'Accept': 'application/xml'
        })
        os.makedirs(CHECKPOINT_DIR, exist_ok=True)
        
    def fetch_all_cases_for_area(self, rechtsgebied: str, noa_area: str) -> List[Dict]:
        """Fetch ALL cases for a specific legal area with pagination"""
        all_cases = []
        checkpoint_file = f"{CHECKPOINT_DIR}/{rechtsgebied.replace(' ', '_')}.json"
        
        # Try to load from checkpoint
        if os.path.exists(checkpoint_file):
            print(f"  Loading from checkpoint: {checkpoint_file}")
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                all_cases = json.load(f)
            print(f"  Resumed with {len(all_cases)} cases")
            return all_cases
        
        print(f"Fetching ALL cases for {rechtsgebied}...")
        
        # Fetch without date restriction to get everything
        offset = 0
        total_fetched = 0
        
        while True:
            params = {
                'rechtsgebieden': rechtsgebied,
                'max': BATCH_SIZE,
                'from': offset,
                'return': 'DOC'
            }
            
            try:
                response = self.session.get(API_BASE, params=params, timeout=30)
                time.sleep(RATE_LIMIT)
                
                if response.status_code != 200:
                    print(f"  Error: HTTP {response.status_code}")
                    break
                
                # Parse XML
                root = ET.fromstring(response.content)
                entries = root.findall('.//{http://www.w3.org/2005/Atom}entry')
                
                if not entries:
                    print(f"  No more cases found at offset {offset}")
                    break
                
                batch_cases = []
                for entry in entries:
                    case_data = self._extract_case_data(entry)
                    if case_data and case_data.get('summary'):
                        batch_cases.append(case_data)
                
                all_cases.extend(batch_cases)
                total_fetched += len(batch_cases)
                
                print(f"  Fetched {total_fetched} cases (batch: {len(batch_cases)}, offset: {offset})")
                
                # Save checkpoint every 5K cases
                if total_fetched % 5000 == 0:
                    with open(checkpoint_file, 'w', encoding='utf-8') as f:
                        json.dump(all_cases, f, ensure_ascii=False)
                    print(f"  💾 Checkpoint saved: {total_fetched} cases")
                
                # If we got less than BATCH_SIZE, we've reached the end
                if len(entries) < BATCH_SIZE:
                    print(f"  ✅ Completed: {total_fetched} total cases")
                    break
                
                offset += BATCH_SIZE
                
            except Exception as e:
                print(f"  Error at offset {offset}: {e}")
                # Save what we have so far
                with open(checkpoint_file, 'w', encoding='utf-8') as f:
                    json.dump(all_cases, f, ensure_ascii=False)
                break
        
        # Final save
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(all_cases, f, ensure_ascii=False)
        
        return all_cases
    
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
            return {}

class EnhancedKeywordExtractor:
    def __init__(self):
        # Dutch stopwords
        self.stopwords = set([
            'de', 'het', 'een', 'en', 'van', 'in', 'op', 'te', 'voor', 'is', 'aan', 'dat',
            'met', 'zijn', 'als', 'heeft', 'wordt', 'door', 'bij', 'ook', 'naar', 'om',
            'deze', 'niet', 'tot', 'kan', 'meer', 'dan', 'uit', 'er', 'over', 'worden',
            'maar', 'of', 'hebben', 'dit', 'zijn', 'was', 'al', 'nog', 'geen', 'tegen',
            'onder', 'tussen', 'na', 'omdat', 'zoals', 'wel', 'alleen', 'zonder', 'zo',
            'zeer', 'moet', 'kunnen', 'echter', 'dus', 'reeds', 'aldus', 'immers', 'haar',
            'hem', 'zijn', 'hun', 'wij', 'zij', 'mij', 'jij', 'ons', 'hen'
        ])
        
        # Expanded procedural/court terms
        self.procedural_terms = set([
            'ecli', 'gharn', 'gharl', 'ghdha', 'ghlee', 'ghsgr', 'ghshe', 'ghams',
            'gerechtshof', 'rechtbank', 'raad', 'hoge', 'crvb', 'cbbb',
            'rbarn', 'rbzwo', 'rbutr', 'rbalm', 'rbshe', 'rbsgr', 'rbrot', 'rbams',
            'rbdha', 'rbmne', 'rbnho', 'rbalk', 'rbmaa', 'rbroe', 'rbgro', 'rblee',
            'rbhaa', 'rblim', 'rbobr', 'rbzwb', 'rbgel', 'rbnne',
            'arnhem', 'zwolle', 'utrecht', 'almelo', "'s-hertogenbosch", "'s-gravenhage",
            'rotterdam', 'amsterdam', 'hague', 'leeuwarden', 'groningen', 'maastricht',
            'eiser', 'eiseres', 'verweerder', 'verweerster', 'verweerders', 'appellant',
            'geïntimeerde', 'gedaagde', 'klager',
            'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus',
            'september', 'oktober', 'november', 'december',
            'ingevolge', 'ingang', 'artikel', 'artikelen', 'lid', 'leden',
            'beslissing', 'uitspraak', 'vonnis', 'arrest', 'beschikking', 'besluit',
            'procedure', 'proceskosten', 'griffierecht', 'zitting',
            'partij', 'partijen', 'zaak', 'zaken', 'nummer', 'nummers',
            'datum', 'jaar', 'jaren', 'maand', 'maanden', 'week', 'weken',
            'hierna', 'verzocht', 'verlenen', 'gesteld', 'state', 'beroep',
            'prinses', 'margriet', 'crvb', 'centrale', 'algemene', 'vraag',
            'gebruik', 'recht', 'hierbij', 'aldus', 'derhalve'
        ])
        
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        text = text.lower()
        text = re.sub(r'[^a-zà-ÿ\s\-\']', ' ', text)
        words = text.split()
        
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
        
        print("\n" + "="*80)
        print("Calculating TF-IDF on full dataset...")
        print("="*80)
        
        # Calculate document frequency
        df = Counter()
        total_docs = 0
        
        for area, docs in documents_by_area.items():
            total_docs += len(docs)
            print(f"Processing {area}: {len(docs)} documents")
            area_words = set()
            for doc in docs:
                area_words.update(self.extract_keywords(doc))
            df.update(area_words)
        
        print(f"\nTotal documents: {total_docs}")
        print(f"Unique terms: {len(df)}")
        
        # Calculate TF-IDF per area
        tfidf_by_area = {}
        
        for area, docs in documents_by_area.items():
            print(f"\nCalculating TF-IDF for {area}...")
            
            # Term frequency
            tf = Counter()
            for doc in docs:
                tf.update(self.extract_keywords(doc))
            
            # TF-IDF scores
            tfidf_scores = {}
            for term, freq in tf.items():
                tf_score = freq / len(docs)
                idf_score = log(total_docs / (df[term] + 1))
                tfidf_scores[term] = tf_score * idf_score
            
            # Top 200 keywords (vs 50 before)
            sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
            tfidf_by_area[area] = sorted_keywords[:200]
            
            print(f"  Top 5 keywords: {[kw for kw, _ in sorted_keywords[:5]]}")
        
        return tfidf_by_area

def main():
    print("="*80)
    print("FULL-SCALE RECHTSPRAAK.NL ANALYSIS")
    print("Target: 876,422 published rulings")
    print("="*80)
    print()
    
    scraper = FullScaleScraper()
    extractor = EnhancedKeywordExtractor()
    
    all_cases = {}
    documents_by_area = {}
    
    for noa_area, rechtspraak_areas in LEGAL_AREA_MAPPING.items():
        print(f"\n{'='*80}")
        print(f"Processing: {noa_area}")
        print(f"{'='*80}")
        
        area_cases = []
        area_documents = []
        
        for rechtsgebied in rechtspraak_areas:
            cases = scraper.fetch_all_cases_for_area(rechtsgebied, noa_area)
            area_cases.extend(cases)
            area_documents.extend([c['summary'] + ' ' + c['title'] for c in cases if c.get('summary')])
        
        all_cases[noa_area] = area_cases
        documents_by_area[noa_area] = area_documents
        
        print(f"✅ Total cases for {noa_area}: {len(area_cases)}")
    
    # Calculate TF-IDF
    tfidf_keywords = extractor.calculate_tfidf(documents_by_area)
    
    # Save results
    output_file = '/home/ubuntu/lawyer-automation-dashboard/docs/rechtspraak-keywords-full.json'
    
    results = {
        'generated_at': datetime.now().isoformat(),
        'total_areas': len(all_cases),
        'total_cases': sum(len(cases) for cases in all_cases.values()),
        'keywords_by_area': {
            area: {
                'case_count': len(all_cases[area]),
                'top_keywords': [
                    {'keyword': kw, 'tfidf_score': round(score, 4)}
                    for kw, score in keywords[:200]  # Top 200
                ]
            }
            for area, keywords in tfidf_keywords.items()
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*80}")
    print(f"✅ FULL ANALYSIS COMPLETE!")
    print(f"Results saved to: {output_file}")
    print(f"Total legal areas: {results['total_areas']}")
    print(f"Total cases processed: {results['total_cases']:,}")
    print(f"Keywords per area: 200 (vs 50 in sample)")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()

