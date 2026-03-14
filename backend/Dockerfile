FROM node:20-slim

WORKDIR /app

# Copy manifests first so the npm-install layer is cached unless they change
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure the uploads directory exists (persisted via Docker volume)
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
