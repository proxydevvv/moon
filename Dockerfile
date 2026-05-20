FROM node:18-bullseye-slim

WORKDIR /usr/src/app

# Install dependencies required by Chromium used by Puppeteer
RUN apt-get update && apt-get install -y \
	ca-certificates \
	fonts-liberation \
	libasound2 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libc6 \
	libcairo2 \
	libcups2 \
	libdbus-1-3 \
	libexpat1 \
	libfontconfig1 \
	libgcc1 \
	libgdk-pixbuf2.0-0 \
	libglib2.0-0 \
	libgtk-3-0 \
	libnspr4 \
	libnss3 \
	libpango-1.0-0 \
	libx11-6 \
	libx11-xcb1 \
	libxcb1 \
	libxcomposite1 \
	libxdamage1 \
	libxrandr2 \
	libxrender1 \
	libxshmfence1 \
	wget \
	--no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
