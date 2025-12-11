FROM python:3.11-slim

WORKDIR /app

# Copy and install common package first
COPY common-package /app/common-package
RUN pip install --no-cache-dir -e /app/common-package

# Copy requirements
COPY api-gateway/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api-gateway/ .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
