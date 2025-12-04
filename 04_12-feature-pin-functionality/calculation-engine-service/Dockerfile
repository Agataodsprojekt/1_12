FROM python:3.11-slim

WORKDIR /app

# Copy and install common package first
COPY common-package /app/common-package
RUN pip install --no-cache-dir -e /app/common-package

COPY calculation-engine-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY calculation-engine-service/ .
EXPOSE 5002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5002"]
