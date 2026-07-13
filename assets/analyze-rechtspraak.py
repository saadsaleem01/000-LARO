#!/usr/bin/env python3
"""
Rechtspraak.nl NLP Analysis
Processes 876,422 court cases to extract legal keywords using TF-IDF
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import sys

# Check if required packages are available
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np
except ImportError:
    print("ERROR: Required packages not installed")
    print("Please run: pip3 install scikit-learn numpy")
    sys.exit(1)

# Dutch legal areas taxonomy (36 areas)
LEGAL_AREAS = [
    "Personen- en Familierecht",
    "Arbeidsrecht",
    "Strafrecht",
    "Bestuursrecht",
    "Belastingrecht",
    "Socialezekerheidsrecht",
    "Ambtenarenrecht",
    "Ondernemingsrecht",
    "Insolventierecht",
    "Goederenrecht",
    "Verbintenissenrecht",
    "Huurrecht",
    "Intellectueel-eigendomsrecht",
    "Mededingingsrecht",
    "Europees recht",
    "Internationaal publiekrecht",
    "Vreemdelingenrecht",
    "Gezondheidsrecht",
    "Omgevingsrecht",
    "Milieurecht",
    "Energierecht",
    "Telecommunicatierecht",
    "Vervoersrecht",
    "Verzekeringsrecht",
    "Financieel recht",
    "Bankrecht",
    "Effectenrecht",
    "Pensioenrecht",
    "Civiel procesrecht",
    "Strafprocesrecht",
    "Bestuurs procesrecht",
    "Arbitragerecht",
    "Mediarecht",
    "Sportrecht",
    "Agrarisch recht",
    "Internationaal privaatrecht",
]

# Dutch stopwords (common words to exclude)
DUTCH_STOPWORDS = set([
    'de', 'het', 'een', 'en', 'van', 'in', 'op', 'te', 'voor', 'is', 'dat', 'aan',
    'met', 'als', 'door', 'bij', 'om', 'tot', 'uit', 'naar', 'er', 'over', 'dan',
    'ook', 'maar', 'zijn', 'heeft', 'kan', 'deze', 'die', 'niet', 'wordt', 'worden',
    'zij', 'hij', 'haar', 'hun', 'mijn', 'zijn', 'was', 'waren', 'meer', 'veel',
    'geen', 'wel', 'nog', 'al', 'zo', 'moet', 'kunnen', 'hebben', 'had', 'zou',
    'der', 'den', 'des', 'ter', 'ten', 'tes', 'artikel', 'lid', 'onder', 'sub',
])

class RechtspraakAnalyzer:
    def __init__(self, input_file: str, output_file: str):
        self.input_file = Path(input_file)
        self.output_file = Path(output_file)
        self.cases_by_area: Dict[str, List[str]] = defaultdict(list)
        self.total_cases = 0
        
    def load_cases(self) -> None:
        """Load all cases from JSONL file"""
        print(f"[Analysis] Loading cases from {self.input_file}...")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if line_num % 10000 == 0:
                    print(f"[Analysis] Loaded {line_num:,} cases...")
                
                try:
                    case = json.loads(line.strip())
                    
                    # Extract text content
                    text = f"{case.get('title', '')} {case.get('summary', '')}"
                    text = self.clean_text(text)
                    
                    if not text or len(text) < 50:
                        continue
                    
                    # Classify by legal area (simple keyword matching for now)
                    areas = self.classify_case(case)
                    
                    for area in areas:
                        self.cases_by_area[area].append(text)
                    
                    self.total_cases += 1
                    
                except json.JSONDecodeError:
                    print(f"[Analysis] Warning: Invalid JSON at line {line_num}")
                    continue
        
        print(f"[Analysis] Loaded {self.total_cases:,} cases")
        print(f"[Analysis] Cases by area:")
        for area, cases in sorted(self.cases_by_area.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"  {area}: {len(cases):,} cases")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove URLs
        text = re.sub(r'http\S+', '', text)
        
        # Remove special characters but keep Dutch letters
        text = re.sub(r'[^a-zA-Z0-9àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ\s-]', '', text)
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        return text.lower()
    
    def classify_case(self, case: dict) -> List[str]:
        """Classify case into legal areas based on keywords"""
        text = f"{case.get('title', '')} {case.get('summary', '')} {case.get('subject', '')}".lower()
        
        areas = []
        
        # Simple keyword-based classification
        if any(word in text for word in ['arbeidsovereenkomst', 'ontslag', 'werknemer', 'werkgever', 'cao']):
            areas.append('Arbeidsrecht')
        
        if any(word in text for word in ['straf', 'verdachte', 'openbaar ministerie', 'delict', 'gevangenisstraf']):
            areas.append('Strafrecht')
        
        if any(word in text for word in ['echtscheiding', 'alimentatie', 'gezag', 'omgang', 'partneralimentatie']):
            areas.append('Personen- en Familierecht')
        
        if any(word in text for word in ['belasting', 'fiscaal', 'heffing', 'aftrek', 'aanslag']):
            areas.append('Belastingrecht')
        
        if any(word in text for word in ['bestuursorgaan', 'besluit', 'awb', 'bezwaar', 'beroep']):
            areas.append('Bestuursrecht')
        
        if any(word in text for word in ['huur', 'huurprijs', 'huurovereenkomst', 'huurder', 'verhuurder']):
            areas.append('Huurrecht')
        
        if any(word in text for word in ['faillissement', 'curator', 'schuldeiser', 'surseance', 'wsnp']):
            areas.append('Insolventierecht')
        
        # If no specific area found, use generic classification
        if not areas:
            if 'rechtbank' in text or 'gerechtshof' in text:
                areas.append('Civiel procesrecht')
        
        return areas if areas else ['Civiel procesrecht']  # Default
    
    def extract_keywords(self, max_keywords=200) -> Dict[str, List[Tuple[str, float]]]:
        """Extract top keywords per legal area using TF-IDF"""
        print(f"[Analysis] Extracting keywords using TF-IDF...")
        
        results = {}
        
        for area, cases in self.cases_by_area.items():
            if len(cases) < 10:
                print(f"[Analysis] Skipping {area}: only {len(cases)} cases")
                continue
            
            print(f"[Analysis] Processing {area}: {len(cases):,} cases...")
            
            try:
                # Create TF-IDF vectorizer
                vectorizer = TfidfVectorizer(
                    max_features=max_keywords * 2,  # Get more, then filter
                    min_df=5,  # Word must appear in at least 5 documents
                    max_df=0.7,  # Word must not appear in more than 70% of documents
                    ngram_range=(1, 3),  # Unigrams, bigrams, trigrams
                    stop_words=list(DUTCH_STOPWORDS),
                    lowercase=True,
                )
                
                # Fit and transform
                tfidf_matrix = vectorizer.fit_transform(cases)
                feature_names = vectorizer.get_feature_names_out()
                
                # Calculate average TF-IDF score per term
                avg_scores = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
                
                # Get top keywords
                top_indices = avg_scores.argsort()[-max_keywords:][::-1]
                top_keywords = [
                    (feature_names[i], float(avg_scores[i]))
                    for i in top_indices
                ]
                
                # Filter out court names and procedural terms
                filtered_keywords = [
                    (keyword, score) for keyword, score in top_keywords
                    if not self.is_procedural_term(keyword)
                ][:max_keywords]
                
                results[area] = filtered_keywords
                
                print(f"[Analysis] {area}: extracted {len(filtered_keywords)} keywords")
                
            except Exception as e:
                print(f"[Analysis] Error processing {area}: {e}")
                continue
        
        return results
    
    def is_procedural_term(self, term: str) -> bool:
        """Check if term is a procedural/court term to filter out"""
        procedural = [
            'rechtbank', 'gerechtshof', 'hoge raad', 'rb', 'ghsgr', 'ecli',
            'uitspraak', 'vonnis', 'arrest', 'beschikking', 'datum',
            'zaaknummer', 'rolnummer', 'partijen', 'eiseres', 'gedaagde',
        ]
        return any(proc in term.lower() for proc in procedural)
    
    def save_results(self, keywords: Dict[str, List[Tuple[str, float]]]) -> None:
        """Save results to JSON file"""
        print(f"[Analysis] Saving results to {self.output_file}...")
        
        output = {
            'generated_at': datetime.now().isoformat(),
            'total_cases': self.total_cases,
            'total_areas': len(keywords),
            'keywords_by_area': {}
        }
        
        for area, kw_list in keywords.items():
            output['keywords_by_area'][area] = {
                'case_count': len(self.cases_by_area[area]),
                'top_keywords': [
                    {'keyword': kw, 'tfidf_score': round(score, 3)}
                    for kw, score in kw_list
                ]
            }
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"[Analysis] Results saved!")
        print(f"[Analysis] File size: {self.output_file.stat().st_size / 1024:.1f} KB")
    
    def run(self) -> None:
        """Run full analysis pipeline"""
        print("[Analysis] Starting Rechtspraak.nl NLP Analysis")
        print(f"[Analysis] Input: {self.input_file}")
        print(f"[Analysis] Output: {self.output_file}")
        print("")
        
        start_time = datetime.now()
        
        # Load cases
        self.load_cases()
        
        # Extract keywords
        keywords = self.extract_keywords(max_keywords=200)
        
        # Save results
        self.save_results(keywords)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n[Analysis] Complete! Total time: {elapsed/60:.1f} minutes")

def main():
    import sys
    
    # Paths
    data_dir = Path(__file__).parent.parent.parent / 'data' / 'rechtspraak'
    input_file = data_dir / 'all-cases.jsonl'
    output_file = Path(__file__).parent.parent.parent / 'docs' / 'rechtspraak-keywords-full.json'
    
    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        print("Please run scrape-rechtspraak.ts first to collect cases")
        sys.exit(1)
    
    analyzer = RechtspraakAnalyzer(str(input_file), str(output_file))
    analyzer.run()

if __name__ == '__main__':
    main()

