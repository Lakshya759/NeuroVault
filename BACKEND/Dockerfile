
# Node.js base image
FROM node:22-bookworm-slim

WORKDIR /app


# Install dependencies required by Python
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Configure uv
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/app/PDF_Ingestion/.venv
ENV UV_PYTHON=3.12
ENV PYTHON_BIN=/app/PDF_Ingestion/.venv/bin/python
# Install Python 3.12
RUN uv python install 3.12


# Copy Node dependencies
COPY package*.json ./

RUN npm ci

# Copy Python dependency configuration
COPY PDF_Ingestion/pyproject.toml PDF_Ingestion/uv.lock ./PDF_Ingestion/

# Install Python dependencies
WORKDIR /app/PDF_Ingestion

RUN uv sync --frozen --no-dev --no-install-project

# Copy complete application
WORKDIR /app

COPY . .

# Verify installations during build
RUN node --version && npm --version && uv --version && \
    $PYTHON_BIN --version

EXPOSE 8000

CMD ["npm", "start"]
