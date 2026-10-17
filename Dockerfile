FROM node:20-alpine AS base

# Install Chromium for reliable anti-bot DOM rendering
RUN apk add --no-cache chromium nss freetype harfbuzz ttf-freefont

# Environment variable pointing to Chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set working directory to /app
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY public/ ./public/
COPY server.js ./

# Create data directory for persistent database
RUN mkdir -p /app/data && chmod -R 777 /app/data

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Expose web server port
EXPOSE 3000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server.js"]
