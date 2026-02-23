# NLP Microservice

FastAPI-based microservice for extracting skills from resume text.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --port 8000
```

The service will be available at http://localhost:8000

## Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /extract-skills` - Extract skills from text

## Example Request

```bash
curl -X POST http://localhost:8000/extract-skills \
  -H "Content-Type: application/json" \
  -d '{"text": "Experienced developer with React, Node.js, Python, and AWS"}'
```
