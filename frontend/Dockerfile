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

# Build arguments (injectés lors du build Vite)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_GA_MEASUREMENT_ID=G-DFDBJ2G2PK
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

RUN npm run build

# ---- Étape 2 : runner Nginx ----
FROM nginx:1.25-alpine AS runner

# Nettoyage et copie de la configuration Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
