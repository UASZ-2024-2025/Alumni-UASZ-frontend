# syntax=docker/dockerfile:1
# Image du frontend pour la démo (ALUM-215) : build Angular, puis nginx non-root sur le port 8080.
#   docker build --build-arg CONFIGURATION=demo -t alumni-frontend .

# ---------- Etape 1 : build ----------
# Le build tourne sur l'architecture de la machine de build : les fichiers produits
# (HTML/JS/CSS) sont identiques pour amd64 et arm64.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
ARG CONFIGURATION=demo
ENV NG_CLI_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration "$CONFIGURATION"

# ---------- Etape 2 : service des fichiers ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/alumni-frontend/browser/ /usr/share/nginx/html/
EXPOSE 8080
