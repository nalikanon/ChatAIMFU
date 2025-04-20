# Use Node.js LTS version as base image
FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    tesseract-ocr \
    tesseract-ocr-tha \
    tesseract-ocr-eng \
    poppler-utils \
    imagemagick \
    ghostscript \
    libmagickwand-dev \
    && rm -rf /var/lib/apt/lists/*

# Configure ImageMagick policy to allow PDF (for both v6 and v7)
COPY policy.xml /etc/ImageMagick-6/policy.xml
COPY policy.xml /etc/ImageMagick-7/policy.xml

# สร้างโฟลเดอร์ uploads และกำหนดสิทธิ์
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Copy package files
COPY package*.json ./

# Install dependencies and TypeScript globally
RUN npm install
RUN npm install -g typescript
RUN npm install chromadb-default-embed
RUN npm install axios cheerio

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]