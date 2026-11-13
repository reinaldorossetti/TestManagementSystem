# Dockerfile for Centro de Execução QA TMS
# Combines Node.js runtime for Next.js with Python 3 & Robot Framework / Playwright test tools

FROM node:20-bookworm AS base

# Install Python 3, pip, and OS dependencies required by Playwright and Robot Framework Browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    git \
    gsettings-desktop-schemas \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment and install Robot Framework packages globally
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install --no-cache-dir \
    robotframework \
    robotframework-browser \
    robotframework-requests

WORKDIR /app

# Copy dependency manifests and prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install Node dependencies
RUN npm ci

# Copy application source code
COPY . .

# Set environment variables for build steps
ENV DATABASE_URL="file:./prisma/dev.db"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npx prisma generate

# Initialize Playwright browser binaries for Robot Framework Browser Library
RUN rfbrowser init || true

# Build Next.js application
RUN npm run build

# Normalize entrypoint line endings (Windows CRLF -> LF) and ensure executable permissions
RUN sed -i 's/\r$//' /app/scripts/docker-entrypoint.sh && chmod +x /app/scripts/docker-entrypoint.sh

# Set environment defaults for container execution
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/login > /dev/null || exit 1

# Ensure database tables and non-destructive seed are synced on startup, then start Next.js
CMD ["/app/scripts/docker-entrypoint.sh"]
