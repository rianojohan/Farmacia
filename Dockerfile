# Imagen de producción para "Solo la Salud" (Next.js fullstack).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# El puerto lo inyecta el runtime (variable PORT); se expone 8080 por defecto.
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "exec npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
