FROM python:3.11-slim
WORKDIR /app

# Copy and install common package first
COPY common-package /app/common-package
RUN pip install --no-cache-dir -e /app/common-package

COPY cost-calculator-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY cost-calculator-service/ .
EXPOSE 5003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5003"]
