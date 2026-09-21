# ============================================================
#  Dockerfile multi-étapes — Frontend React + Vite
# ============================================================

# ---- Étape 1 : build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances (cache)
COPY package*.json ./
RUN npm ci

# Source code & Build
COPY . .

# Build argument pour la base URL API (par défaut /api pour architecture single-origin)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Étape 2 : runner Nginx ----
FROM nginx:1.25-alpine AS runner

# Nettoyage et copie de la configuration Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
