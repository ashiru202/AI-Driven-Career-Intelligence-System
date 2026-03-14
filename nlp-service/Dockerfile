FROM python:3.11-slim

WORKDIR /app

# Install build tools and curl (used in the docker-compose healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies before copying source code so this layer is
# cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run without --reload in the container (source is not mounted in production)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
