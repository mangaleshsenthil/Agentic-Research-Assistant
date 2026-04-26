import os
from dotenv import load_dotenv

load_dotenv()

def parse_keys(env_var_plural, env_var_singular):
    keys_str = os.getenv(env_var_plural)
    if keys_str:
        return [k.strip() for k in keys_str.split(',') if k.strip()]
    single_key = os.getenv(env_var_singular)
    if single_key:
        return [single_key.strip()]
    return []

# ── Gemini (Agent 1 – Summarization) ──────────────────────────────
GEMINI_API_KEYS = parse_keys("GEMINI_API_KEYS", "GEMINI_API_KEY")
if not GEMINI_API_KEYS:
    raise RuntimeError(
        "GEMINI_API_KEYS is not set. Please add it to your .env or environment variables."
    )

TEXT_MODEL = "gemini-2.5-flash"
EMBEDDING_MODEL = "gemini-embedding-001"
VECTOR_DIMENSION = 3072
IMAGE_MODEL = "gemini-2.0-flash" # More stable free-tier model

# ── Groq (Agent 2 – Research Discovery) ──────────────────────────
GROQ_API_KEYS = parse_keys("GROQ_API_KEYS", "GROQ_API_KEY")
if not GROQ_API_KEYS:
    raise RuntimeError(
        "GROQ_API_KEYS is not set. Please add it to your .env or environment variables."
    )

GROQ_MODEL = "llama-3.3-70b-versatile"

# ── Anthropic (Agent 3 – Workflow Generator) ─────────────────────
ANTHROPIC_API_KEYS = parse_keys("ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"