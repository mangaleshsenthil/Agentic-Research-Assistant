import fitz  # PyMuPDF
import re

class DocumentProcessor:
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """Extracts text from PDF and performs initial cleaning."""
        text = ""
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
        return DocumentProcessor.clean_text(text)

    @staticmethod
    def clean_text(text: str) -> str:
        """Removes common PDF artifacts and extra whitespace."""
        # Remove common PDF headers/footers (simple numeric patterns)
        text = re.sub(r'\n\d+\s*\n', '\n', text) 
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    def get_chunks(text: str, chunk_size: int = 1000, overlap: int = 200) -> list:
        """
        Creates overlapping chunks to ensure context isn't lost at boundaries.
        This is a 'from scratch' implementation of a sliding window.
        """
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunks.append(text[i : i + chunk_size])
        return chunks