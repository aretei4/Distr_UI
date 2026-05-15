# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci --silent

# Copy source
COPY . .

# Build — nginx will proxy /api to the backend container
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built React files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our nginx config (SPA routing + health endpoint)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
