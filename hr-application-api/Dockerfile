# ============================================================
# BUILDER STAGE
# ============================================================

FROM python:3.11-slim AS builder

WORKDIR /build

# Install Linux compiler/build tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python build tools
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        cython \
        setuptools \
        wheel

# Copy requirements
COPY requirements.txt .

# Install application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Compile Python files into Linux .so files
RUN python setup.py build_ext --inplace


# ============================================================
# PRODUCTION STAGE
# ============================================================

FROM python:3.11-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=2

# Copy Python packages
COPY --from=builder /usr/local/lib/python3.11/site-packages \
    /usr/local/lib/python3.11/site-packages

# Copy executable scripts
COPY --from=builder /usr/local/bin/gunicorn \
    /usr/local/bin/gunicorn

COPY --from=builder /usr/local/bin/uvicorn \
    /usr/local/bin/uvicorn

COPY --from=builder /usr/local/bin/rq \
    /usr/local/bin/rq

# Copy compiled application
COPY --from=builder /build/app ./app

# Remove Python source code
RUN find ./app \
    -type f \
    -name "*.py" \
    ! -name "__init__.py" \
    -delete

# Container port
EXPOSE 8000

# Start FastAPI
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "1", "--bind", "0.0.0.0:8000"]