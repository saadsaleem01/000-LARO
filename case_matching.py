# Legal AI Case Matching Module

import re

from dutch_legal_taxonomy import DUTCH_LEGAL_AREAS, infer_legal_area_matches

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    TfidfVectorizer = None
    cosine_similarity = None

try:
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
except ImportError:
    stopwords = None
    word_tokenize = None
    WordNetLemmatizer = None


class _FallbackLemmatizer:
    def lemmatize(self, token):
        return token


FALLBACK_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from",
    "has", "have", "he", "her", "his", "i", "in", "is", "it", "its", "me", "my",
    "of", "on", "or", "our", "she", "that", "the", "their", "they", "this", "to",
    "was", "we", "were", "with", "you", "your"
}

class LegalCaseMatcher:
    """
    AI-powered case matching system that analyzes user case descriptions
    and determines the appropriate legal field(s).
    """
    
    def __init__(self):
        """Initialize the case matcher with legal field definitions and models."""
        self.lemmatizer = WordNetLemmatizer() if WordNetLemmatizer else _FallbackLemmatizer()
        try:
            self.stop_words = set(stopwords.words('english')) if stopwords else FALLBACK_STOP_WORDS
        except LookupError:
            self.stop_words = FALLBACK_STOP_WORDS
        
        # Use the same 35-area NOvA vocabulary as lawyer matching and the UI.
        self.legal_fields = {
            area['key'].lower(): {
                'name': area['label_en'],
                'name_nl': area['name_nl'],
                'nova_id': area['nova_id'],
                'keywords': list(area['keywords']) + list(area['subareas']) + list(area['aliases']),
                'description': (
                    f"Dutch legal area: {area['name_nl']}"
                    + (f". Includes {', '.join(area['subareas'])}." if area['subareas'] else ".")
                ),
            }
            for area in DUTCH_LEGAL_AREAS
        }
        
        # Create a corpus of legal field descriptions for TF-IDF
        self.field_corpus = []
        self.field_names = []
        
        for field_id, field_data in self.legal_fields.items():
            field_text = f"{field_data['name']} {field_data['description']} {' '.join(field_data['keywords'])}"
            self.field_corpus.append(field_text)
            self.field_names.append(field_id)
        
        # Initialize TF-IDF vectorizer when scikit-learn is installed; otherwise
        # use deterministic keyword matching so local startup still works.
        self.vectorizer = TfidfVectorizer(stop_words='english') if TfidfVectorizer else None
        self.field_vectors = self.vectorizer.fit_transform(self.field_corpus) if self.vectorizer else None
    
    def preprocess_text(self, text):
        """Preprocess the input text for analysis."""
        # Tokenize text. Use NLTK when installed with data, otherwise keep local
        # startup working with a deterministic regex tokenizer.
        try:
            tokens = word_tokenize(text.lower()) if word_tokenize else re.findall(r"\b\w+\b", text.lower())
        except LookupError:
            tokens = re.findall(r"\b\w+\b", text.lower())
        
        # Remove stopwords and lemmatize
        processed_tokens = [
            self.lemmatizer.lemmatize(token) 
            for token in tokens 
            if token.isalnum() and token not in self.stop_words
        ]
        
        return ' '.join(processed_tokens)
    
    def match_legal_fields(self, case_description, num_matches=3):
        """
        Match case description to appropriate legal fields.
        
        Args:
            case_description (str): User's description of their legal case
            num_matches (int): Number of top matches to return
            
        Returns:
            list: List of dictionaries containing matched fields with confidence scores
        """
        taxonomy_matches = infer_legal_area_matches(case_description, limit=num_matches)
        if taxonomy_matches:
            return [{
                'field_id': item['key'].lower(),
                'field_name': item['label_en'],
                'field_name_nl': item['name_nl'],
                'nova_id': item['nova_id'],
                'confidence': item['confidence'],
                'matched_terms': item['matched_terms'],
                'description': self.legal_fields[item['key'].lower()]['description'],
            } for item in taxonomy_matches]

        # Retain a deterministic TF-IDF fallback for sparse descriptions.
        processed_description = self.preprocess_text(case_description)
        
        if self.vectorizer and cosine_similarity is not None:
            # Vectorize the processed description
            case_vector = self.vectorizer.transform([processed_description])
            
            # Calculate similarity scores
            similarity_scores = cosine_similarity(case_vector, self.field_vectors)[0]
            
            # Create a list of (field_id, score) tuples
            field_scores = list(zip(self.field_names, similarity_scores))
        else:
            lowered = processed_description.lower()
            field_scores = []
            for field_id, field_data in self.legal_fields.items():
                keywords = field_data["keywords"]
                hits = sum(1 for keyword in keywords if keyword.lower() in lowered)
                score = hits / max(len(keywords), 1)
                field_scores.append((field_id, score))
        
        # Sort by score in descending order
        field_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top matches with normalized confidence scores
        results = []
        for field_id, score in field_scores[:num_matches]:
            if score > 0.1:  # Only include matches with reasonable confidence
                results.append({
                    'field_id': field_id,
                    'field_name': self.legal_fields[field_id]['name'],
                    'confidence': float(score),
                    'description': self.legal_fields[field_id]['description']
                })
        
        return results
    
    def analyze_case_complexity(self, case_description):
        """
        Analyze the complexity of a legal case based on various factors.
        
        Args:
            case_description (str): User's description of their legal case
            
        Returns:
            dict: Complexity analysis results
        """
        # Preprocess the case description
        processed_description = self.preprocess_text(case_description)
        
        # Simple complexity metrics
        word_count = len(processed_description.split())
        unique_words = len(set(processed_description.split()))
        
        # Calculate lexical diversity (higher means more complex)
        lexical_diversity = unique_words / word_count if word_count > 0 else 0
        
        # Count legal terminology
        legal_term_count = 0
        all_legal_terms = []
        for field_data in self.legal_fields.values():
            all_legal_terms.extend(field_data['keywords'])
        
        for term in all_legal_terms:
            if term.lower() in processed_description.lower():
                legal_term_count += 1
        
        # Calculate complexity score (0-100 scale)
        complexity_base = min(100, (word_count / 200) * 40)  # Length component
        complexity_diversity = lexical_diversity * 30  # Vocabulary diversity component
        complexity_legal = min(30, (legal_term_count / 10) * 30)  # Legal terminology component
        
        complexity_score = complexity_base + complexity_diversity + complexity_legal
        complexity_score = min(100, complexity_score)  # Cap at 100
        
        # Determine complexity level
        if complexity_score < 30:
            complexity_level = "Low"
        elif complexity_score < 60:
            complexity_level = "Medium"
        else:
            complexity_level = "High"
        
        return {
            'complexity_score': complexity_score,
            'complexity_level': complexity_level,
            'word_count': word_count,
            'unique_words': unique_words,
            'lexical_diversity': lexical_diversity,
            'legal_term_count': legal_term_count
        }
    
    def generate_case_summary(self, case_description):
        """
        Generate a concise summary of the legal case for lawyers.
        
        Args:
            case_description (str): User's description of their legal case
            
        Returns:
            str: Summarized case description
        """
        # This is a simplified version - in a real implementation, 
        # we would use more sophisticated NLP techniques or a language model
        
        # For now, extract key sentences based on legal terminology
        sentences = case_description.split('.')
        scored_sentences = []
        
        all_legal_terms = []
        for field_data in self.legal_fields.values():
            all_legal_terms.extend(field_data['keywords'])
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            score = 0
            for term in all_legal_terms:
                if term.lower() in sentence.lower():
                    score += 1
            
            scored_sentences.append((sentence, score))
        
        # Sort sentences by score
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        # Take top 3 sentences or fewer if there aren't enough
        top_sentences = [s[0] for s in scored_sentences[:3]]
        
        # Create summary
        summary = '. '.join(top_sentences)
        if summary and not summary.endswith('.'):
            summary += '.'
            
        return summary

# Example usage
if __name__ == "__main__":
    case_matcher = LegalCaseMatcher()
    
    # Example case description
    case_description = """
    I've been working at my company for 5 years, and last month I was terminated without any warning.
    My manager said it was due to budget cuts, but I noticed they hired someone younger for my position
    two weeks later. I believe I was discriminated against because of my age (I'm 52). I had excellent
    performance reviews throughout my time there. I want to know if I have a case for wrongful termination.
    """
    
    # Match legal fields
    matched_fields = case_matcher.match_legal_fields(case_description)
    print("Matched Legal Fields:")
    for field in matched_fields:
        print(f"{field['field_name']}: {field['confidence']:.2f}")
    
    # Analyze complexity
    complexity = case_matcher.analyze_case_complexity(case_description)
    print(f"\nCase Complexity: {complexity['complexity_level']} ({complexity['complexity_score']:.2f}/100)")
    
    # Generate summary
    summary = case_matcher.generate_case_summary(case_description)
    print(f"\nCase Summary:\n{summary}")
