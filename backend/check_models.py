import os
from dotenv import load_dotenv
from google.genai import Client

load_dotenv()

client = Client(api_key=os.getenv("GEMINI_API_KEY"))

print("--- Available Embedding Models ---")
for m in client.models.list():
    methods = getattr(m, 'supported_embedding_methods', None)
    if methods and 'embedContent' in methods:
        print(f"Model Name: {m.name}")

# Optionally attempt a tiny generation on each model to surface which
# models the current key can actually call without raising 404/403.
print("\n--- Generation Capable Models (trial run) ---")
for m in client.models.list():
    try:
        # only try short content to avoid using too many tokens/quota
        resp = client.models.generate_content(model=m.name, contents="Hi")
        print(f"Model {m.name} responded: {resp.text[:20]!r}")
    except Exception as exc:  # noqa: E722
        print(f"Model {m.name} failed: {exc}")
