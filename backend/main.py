import time
import uuid
import os
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import GEMINI_API_KEYS, GROQ_API_KEYS
from core_rag import CustomRAGEngine
from agents import SummarizationAgent, ResearchDiscoveryAgent, WorkflowGeneratorAgent
from utils import log_event

app = FastAPI(title="Agentic Research Assistant")

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize Agents ────────────────────────────────────────────
rag_engine = CustomRAGEngine()
summarization_agent = SummarizationAgent(api_keys=GEMINI_API_KEYS)
discovery_agent = ResearchDiscoveryAgent(api_keys=GEMINI_API_KEYS)
workflow_agent = WorkflowGeneratorAgent(gemini_keys=GEMINI_API_KEYS, groq_keys=GROQ_API_KEYS)

# In-memory store for parsed papers  {paper_id: {...}}
papers_store: dict = {}
# Store for generated workflows {workflow_id: {text, file_path, image_path}}
workflows_store: dict = {}


# ── Request Models ───────────────────────────────────────────────
class SectionRequest(BaseModel):
    paper_id: str
    heading: str


class WorkflowRequest(BaseModel):
    paper_id: str
    selected_item: str


# ── POST /upload ─────────────────────────────────────────────────
@app.post("/upload")
async def upload_paper(file: UploadFile = File(...)):
    """
    1. Save the uploaded PDF
    2. Extract sections (font-based heading detection)
    3. Build FAISS vector store
    4. Run Agent 1 (full summary) and Agent 2 (research discovery) IN PARALLEL
    5. Return headings + full summary + research ideas
    """
    total_start = time.perf_counter()
    paper_id = str(uuid.uuid4())
    temp_path = f"temp_{paper_id}.pdf"

    # Save file
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    log_event(f"Paper '{file.filename}' saved as {temp_path}")

    try:
        # ── Step 1: Extract sections by font heuristics ──────────
        sections = CustomRAGEngine.extract_sections_by_font(temp_path)
        headings = list(sections.keys())
        log_event(f"Extracted {len(headings)} sections: {headings}")

        # ── Step 2: Build FAISS index for RAG ────────────────────
        full_text = CustomRAGEngine.extract_full_text(temp_path)
        rag_engine.extract_and_chunk(temp_path)
        rag_engine.create_vector_store(rag_engine.documents)
        context = rag_engine.query_context("key findings, methodology, results, and contributions")
        log_event("FAISS index built and context retrieved")

        # ── Step 3: Run BOTH agents in parallel ──────────────────
        log_event("Launching Agent 1 (Gemini) and Agent 2 (Groq) in parallel...")

        agent1_start = time.perf_counter()
        agent2_start = time.perf_counter()

        async def run_agent1():
            """Summarization Agent — extract headings + full summary"""
            start = time.perf_counter()
            llm_headings = await summarization_agent.extract_headings(full_text)
            summary = await summarization_agent.summarize_full(context)
            duration = time.perf_counter() - start
            log_event(f"✅ Agent 1 (Summarization/Gemini) finished in {duration:.2f}s")
            return llm_headings, summary

        async def run_agent2():
            """Research Discovery Agent — ideas, models, related papers"""
            start = time.perf_counter()
            ideas = await discovery_agent.discover(context)
            duration = time.perf_counter() - start
            log_event(f"✅ Agent 2 (Discovery/Groq) finished in {duration:.2f}s")
            return ideas

        (llm_headings, full_summary), research_ideas = await asyncio.gather(
            run_agent1(), run_agent2()
        )

        # Merge font-detected headings with LLM-detected ones (prefer font)
        merged_headings = headings if len(headings) > 2 else llm_headings

        # ── Store for later section queries ──────────────────────
        papers_store[paper_id] = {
            "sections": sections,
            "headings": merged_headings,
            "full_text": full_text,
            "context": context,
            "filename": file.filename,
        }

        total_duration = time.perf_counter() - total_start
        log_event(f"TOTAL EXECUTION TIME: {total_duration:.2f}s")

        return {
            "status": "success",
            "paper_id": paper_id,
            "filename": file.filename,
            "headings": merged_headings,
            "full_summary": full_summary,
            "research_ideas": research_ideas,
            "execution_time": f"{total_duration:.2f}s",
        }

    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── POST /summarize-section ──────────────────────────────────────
@app.post("/summarize-section")
async def summarize_section(req: SectionRequest):
    """On-demand: summarize a specific section using Agent 1."""
    paper = papers_store.get(req.paper_id)
    if not paper:
        return {"status": "error", "message": "Paper not found. Please upload again."}

    start = time.perf_counter()

    # Find section content (fuzzy match on heading)
    sections = paper["sections"]
    section_content = None
    for heading, content in sections.items():
        if req.heading.lower() in heading.lower() or heading.lower() in req.heading.lower():
            section_content = content
            break

    if not section_content:
        # Fallback: use RAG context to answer about this heading
        section_content = paper.get("context", "No content available for this section.")

    summary = await summarization_agent.summarize_section(req.heading, section_content)
    duration = time.perf_counter() - start
    log_event(f"Section '{req.heading}' summarized in {duration:.2f}s")

    return {
        "status": "success",
        "heading": req.heading,
        "summary": summary,
        "execution_time": f"{duration:.2f}s",
    }


# ── POST /generate-workflow ──────────────────────────────────────
@app.post("/generate-workflow")
async def generate_workflow(req: WorkflowRequest):
    """
    Generate a research project workflow based on a selected idea/model.
    1. Triggers Agent 3 (Workflow Generator)
    2. Generates detailed text via Groq
    3. (Optional) Generates diagram image via Gemini Nano Banana
    4. Creates a Word document (.docx)
    """
    paper = papers_store.get(req.paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    workflow_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    # Generate workflow text
    workflow_text = await workflow_agent.generate_workflow_text(
        req.selected_item, 
        paper["context"]
    )

    # Create Word Doc
    docx_filename = f"workflow_{workflow_id}.docx"
    docx_path = os.path.join(os.getcwd(), docx_filename)
    workflow_agent.create_word_doc(workflow_text, docx_path)

    workflows_store[workflow_id] = {
        "text": workflow_text,
        "docx_path": docx_path,
        "paper_id": req.paper_id,
        "selected_item": req.selected_item
    }

    duration = time.perf_counter() - start_time
    log_event(f"Workflow {workflow_id} generated in {duration:.2f}s")

    return {
        "status": "success",
        "workflow_id": workflow_id,
        "workflow_text": workflow_text,
        "execution_time": f"{duration:.2f}s",
    }


# ── GET /download-workflow/{id} ──────────────────────────────────
@app.get("/download-workflow/{workflow_id}")
async def download_workflow(workflow_id: str):
    """Serve the generated .docx file."""
    workflow = workflows_store.get(workflow_id)
    if not workflow or not os.path.exists(workflow["docx_path"]):
        raise HTTPException(status_code=404, detail="Workflow file not found")

    filename = f"Research_Workflow_{workflow_id[:8]}.docx"
    return FileResponse(
        path=workflow["docx_path"],
        filename=filename,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
