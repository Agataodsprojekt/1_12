FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ifcopenshell
RUN apt-get update && apt-get install -y \
    build-essential \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install common package first
COPY common-package /app/common-package
RUN pip install --no-cache-dir -e /app/common-package

# Copy requirements
COPY ifc-parser-service/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ifc-parser-service/ .

# Expose port
EXPOSE 5001

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]
