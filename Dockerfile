# ==== Build ====
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

ARG NUXT_PUBLIC_API_BASE
ARG NUXT_API_BASE

ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_API_BASE=$NUXT_API_BASE

ENV NODE_OPTIONS="--max-old-space-size=4096"

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
