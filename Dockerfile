# ==== Build ====
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

ARG NUXT_PUBLIC_API_BASE
ARG NUXT_API_BASE

ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_API_BASE=$NUXT_API_BASE

# 👇 Debug - verificar que los ARGs llegaron
RUN echo "NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE" && \
    echo "NUXT_API_BASE=$NUXT_API_BASE"

# Heap configurable del build (subir vía --build-arg NODE_MEMORY=8192 si hiciera falta)
ARG NODE_MEMORY=6144
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY}"
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ==== Runtime ====
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
