# ── Stage 1: Build the React application ─────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# CI=false prevents react-scripts from treating warnings as errors
ENV CI=false
RUN npm run build

# ── Stage 2: Serve the production build with nginx ────────────────────────────
FROM nginx:stable-alpine

# Replace the default nginx config with our SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled React app from the build stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
