FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper code
COPY . .

# Create downloads directory
RUN mkdir -p downloads/house downloads/senate

# Run scraper in continuous mode
CMD ["python", "main.py", "--mode", "continuous", "--interval", "30"]
