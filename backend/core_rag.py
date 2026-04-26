import os
import fitz  # PyMuPDF
import faiss
import numpy as np
from collections import OrderedDict
from dotenv import load_dotenv
from google.genai import Client

from config import EMBEDDING_MODEL, VECTOR_DIMENSION, GEMINI_API_KEYS

load_dotenv()


class CustomRAGEngine:
    def __init__(self):
        self.dimension = VECTOR_DIMENSION
        self.index = faiss.IndexFlatIP(self.dimension)
        self.documents = []

    # ── PDF → structured sections ─────────────────────────────────

    # Known academic section headings (lowercase) to identify real sections
    ACADEMIC_HEADINGS = {
        "abstract", "introduction", "background", "related work",
        "literature review", "methodology", "method", "methods",
        "approach", "proposed method", "proposed approach",
        "experimental setup", "experiments", "experiment",
        "results", "evaluation", "analysis", "discussion",
        "conclusion", "conclusions", "future work",
        "acknowledgements", "acknowledgments", "references",
        "appendix", "supplementary", "limitations",
    }

    @classmethod
    def _is_real_heading(cls, text: str) -> bool:
        """Filter out author names, numbers, and junk detected as headings."""
        t = text.strip()
        # Too short
        if len(t) < 3:
            return False
        # Purely numeric or a decimal number (e.g. "41.29", "10")
        try:
            float(t.replace(",", ""))
            return False
        except ValueError:
            pass
        # Known academic heading → definitely keep
        if t.lower().rstrip(".").strip() in cls.ACADEMIC_HEADINGS:
            return True
        # Starts with a number followed by a dot/space (e.g. "3.1 Data Collection")
        if len(t) > 3 and t[0].isdigit():
            return True
        # If no digits and it's just 1-3 words (likely a name), skip it
        words = t.split()
        if len(words) <= 3 and not any(c.isdigit() for c in t):
            # Check if it looks like a real heading keyword
            if t.lower().rstrip(".").strip() not in cls.ACADEMIC_HEADINGS:
                # Allow if it contains typical heading words
                heading_keywords = {"model", "network", "layer", "training",
                                    "data", "system", "architecture", "encoder",
                                    "decoder", "attention", "embedding", "parsing",
                                    "translation", "regularization", "optimizer",
                                    "schedule", "hardware", "positional", "softmax",
                                    "feed-forward", "self-attention", "variation"}
                if not any(kw in t.lower() for kw in heading_keywords):
                    return False
        return True

    @staticmethod
    def extract_sections_by_font(pdf_path: str) -> OrderedDict:
        """Use PyMuPDF font-size heuristics to split a PDF into
        {heading: content} pairs.  Larger / bold text is treated as a heading.
        Filters out author names, title, and junk entries.
        """
        doc = fitz.open(pdf_path)

        # Pass 1: collect every text span with its font size
        spans = []
        for page in doc:
            blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            spans.append({
                                "text": text,
                                "size": round(span["size"], 1),
                                "flags": span["flags"],
                            })

        if not spans:
            return OrderedDict({"Full Paper": ""})

        # Pass 2: determine heading threshold
        sizes = [s["size"] for s in spans]
        body_size = max(set(sizes), key=sizes.count)
        heading_threshold = body_size + 1.0

        # Pass 3: build raw section map
        sections = OrderedDict()
        current_heading = "Preamble"
        current_content = []

        for span in spans:
            is_heading = (
                span["size"] >= heading_threshold
                or (span["flags"] & 2**4 and span["size"] >= body_size)
            )
            if is_heading and len(span["text"]) < 120:
                if current_content:
                    sections[current_heading] = " ".join(current_content)
                current_heading = span["text"]
                current_content = []
            else:
                current_content.append(span["text"])

        if current_content:
            sections[current_heading] = " ".join(current_content)

        # Pass 4: filter — drop preamble, authors, numbers, junk
        filtered = OrderedDict()
        found_first_real = False
        for heading, content in sections.items():
            if not content.strip():
                continue
            # Skip everything before the first recognized academic heading
            if not found_first_real:
                if heading.lower().rstrip(".").strip() in CustomRAGEngine.ACADEMIC_HEADINGS:
                    found_first_real = True
                elif heading[0:1].isdigit():  # numbered section like "1 Introduction"
                    found_first_real = True
                else:
                    continue  # skip preamble / title / authors
            # Apply heading quality filter
            if CustomRAGEngine._is_real_heading(heading):
                filtered[heading] = content

        return filtered if filtered else OrderedDict({"Full Paper": " ".join(s["text"] for s in spans)})

    @staticmethod
    def extract_full_text(pdf_path: str) -> str:
        """Extract all text from a PDF as a single string."""
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text("text")
        return text

    # ── Chunking & FAISS vector store ─────────────────────────────

    def extract_and_chunk(self, pdf_path: str):
        """Extracts text using PyMuPDF and chunks by paragraph."""
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text("text")

        chunks = [p.strip() for p in full_text.split('\n\n') if len(p.strip()) > 150]
        self.documents = chunks
        return chunks

    def create_vector_store(self, chunks: list[str]):
        """Generates embeddings via Gemini and stores them in FAISS."""
        embeddings = []
        keys_list = GEMINI_API_KEYS
        max_attempts = max(5, len(keys_list) * 2)

        for chunk in chunks:
            chunk_success = False
            for attempt in range(max_attempts):
                current_key = keys_list[attempt % len(keys_list)]
                client = Client(api_key=current_key)
                try:
                    res = client.models.embed_content(
                        model=EMBEDDING_MODEL,
                        contents=[chunk],
                    )
                    embeddings.append(res.embeddings[0].values)
                    chunk_success = True
                    break
                except Exception as e:
                    is_rate_limit = False
                    if hasattr(e, 'code') and e.code == 429:
                        is_rate_limit = True
                    elif "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                        is_rate_limit = True
                        
                    if is_rate_limit and attempt < max_attempts - 1:
                        if len(keys_list) > 1 and (attempt + 1) % len(keys_list) != 0:
                            continue
                        else:
                            import time
                            time.sleep(15 * ((attempt // len(keys_list)) + 1))
                    else:
                        if hasattr(e, 'response') and getattr(e.response, 'status_code', None) == 404:
                            raise RuntimeError(f"Embedding model '{EMBEDDING_MODEL}' not found.")
                        raise
            
            if not chunk_success:
                raise RuntimeError("Failed to embed chunk after all API key retries.")

        embeddings = np.array(embeddings).astype('float32')
        faiss.normalize_L2(embeddings)

        embedding_dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(embedding_dim)
        self.index.add(embeddings)

    def query_context(self, user_query: str, top_k: int = 5) -> str:
        """Returns top-k relevant chunks for the given query."""
        keys_list = GEMINI_API_KEYS
        max_attempts = max(5, len(keys_list) * 2)
        query_res = None
        
        for attempt in range(max_attempts):
            current_key = keys_list[attempt % len(keys_list)]
            client = Client(api_key=current_key)
            try:
                query_res = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=[user_query],
                )
                break
            except Exception as e:
                is_rate_limit = False
                if hasattr(e, 'code') and e.code == 429:
                    is_rate_limit = True
                elif "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    is_rate_limit = True
                    
                if is_rate_limit and attempt < max_attempts - 1:
                    if len(keys_list) > 1 and (attempt + 1) % len(keys_list) != 0:
                        continue
                    else:
                        import time
                        time.sleep(15 * ((attempt // len(keys_list)) + 1))
                else:
                    if hasattr(e, 'response') and getattr(e.response, 'status_code', None) == 404:
                        raise RuntimeError(f"Embedding model '{EMBEDDING_MODEL}' not found.")
                    raise

        if not query_res:
            raise RuntimeError("Failed to query context due to API errors.")

        query_vec = np.array(query_res.embeddings[0].values).astype('float32').reshape(1, -1)
        faiss.normalize_L2(query_vec)

        distances, indices = self.index.search(query_vec, top_k)
        context = [self.documents[i] for i in indices[0] if i != -1]
        return "\n---\n".join(context)