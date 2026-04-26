# 🧠 Agentic Research Assistant

> **A Multi-Agent LLM Framework for Automating Academic Research Tasks**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Groq](https://img.shields.io/badge/Groq-Cloud-blue?style=flat)](https://groq.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)

The **Agentic Research Assistant** is an enterprise-grade artificial intelligence framework engineered to revolutionize how researchers, academics, and data scientists interact with complex scientific literature. Traditional parsing tools fail at deep mathematical notation and intricate academic context. This project abandons the single-LLM approach for a highly parallelized **"Mixture of Agents"** framework, specializing in structural ingestion, contextual summarization, autonomous hypothesis generation, and mathematical algorithmic modeling.

By leveraging Google's Gemini 2.0 (for immense context ingestion) and Groq's low-latency LPU inference with LLaMA-3.3-70B (for deep logical discovery), this system parses PDFs, renders deep native equations via KaTeX, and outputs actionable, exportable academic insights.

---

## ✨ Key Features

- **📄 Intelligent PDF Ingestion:** Uses PyMuPDF with advanced heuristics to scan, identify structural taxonomy (headings vs body text), and extract meaning safely.
- **🤖 Multi-Agent Orchestration:**
  - **Agent 1 (The Taxonomist / RAG Engine):** Uses Gemini 2.0 Flash + In-Memory FAISS Vector DB to isolate methodologies, results, and compile structured academic summaries.
  - **Agent 2 (The Researcher):** Uses Groq LLaMA-3.3-70B to hallucinate safe, unbounded future research ideas, alternative methodologies, and literature mappings.
  - **Agent 3 (The Architect):** Uses LLaMA-3.3-70B to formulate step-by-step algorithms, pseudo-code, and mathematical constraints from generated theories.
- **🧮 Native Mathematical Rendering:** Complete React DOM processing using `react-markdown`, `remark-math`, and `rehype-katex` to render generated LaTeX ($\nabla f(x)$) accurately without requesting image approximations.
- **🔄 Dynamic API Key Rotation:** Fault-tolerant connection handling gracefully catches `HTTP 429` (Rate limits) and automatically rotates through an array of API keys, falling back natively to asynchronous exponential backoff queueing.
- **📥 Microsoft Word Direct Export:** Uses `python-docx` to bundle compiled findings, hypotheses, and algorithms directly into a downloadable `.docx` file for immediate thesis integration.

---

## 🏗️ Global System Architecture

The project operates on a fully decoupled microservices architecture:

1. **Frontend (React / UI):** Built utilizing Vite, TailwindCSS (for responsive glassmorphism), and advanced React Hooks for state/modal management.
2. **Backend (Python / FastAPI):** Handles ASGI primitives, multipart-payload parsing, and async/await non-blocking concurrency for intensive LLM inference.
3. **Data Retrieval:** An in-memory FAISS vector database temporally chunks embeddings using `models/text-embedding-004` to eliminate RAG hallucination and improve context.

---

## 🛠️ Technology Stack

| Component         | Technology                                                                |
| ----------------- | ------------------------------------------------------------------------- |
| **Frontend**      | React.js, Vite, Tailwind CSS, `react-markdown`, `remark-math`, `KaTeX`|
| **Backend**       | Python, FastAPI, Pydantic, Uvicorn, Asynchronous I/O                      |
| **AI / LLM**      | Google Gemini 2.0 Flash, Meta LLaMA 3.3 (70B) via Groq Cloud              |
| **Data / Memory** | FAISS Vector Search, `text-embedding-004`                                 |
| **Parsing**       | PyMuPDF / fitz, `python-docx`                                             |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.9+)
- Groq Cloud API Key
- Google Gemini API Key

### 1. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install required dependencies
pip install -r requirements.txt

# Create an Environment File
# Populate your `.env` file with commas to use dynamic key-rotation for limits
echo "GROQ_API_KEYS=key1,key2,key3" > .env
echo "GEMINI_API_KEYS=keyA,keyB,keyC" >> .env

# Run FastAPI Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Start Vite Development Server
npm run dev
```
Navigate your browser to `http://localhost:5173` to access the interactive dashboard.

---

## 🔮 Future Extensibility

- **Automated ArXiv Crawling:** Agents will recursively ping Google Scholar to self-validate generated claims.
- **Multi-Agent Voting Systems:** Incorporate an explicit "Reviewer Agent" to strictly analyze logic pathways returned by the Researcher before final UI delivery.
