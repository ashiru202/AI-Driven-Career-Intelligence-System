import os


# Ensure the FastAPI app can be imported during test collection.
#
# The service enforces INTERNAL_TOKEN at import time (nlp-service/config.py).
# During tests we don't want to require CI secrets, and we also need to
# override any local `.env` that might define INTERNAL_TOKEN=changeme.
token = (os.getenv("INTERNAL_TOKEN") or os.getenv("NLP_INTERNAL_TOKEN") or "").strip()
if not token or token.lower() == "changeme":
    os.environ["INTERNAL_TOKEN"] = "pytest-internal-token"
