# Build stage: needs devDependencies (typescript, vite, sass) to compile
# Debian slim, not alpine: imagescript ships a glibc-only native binary
FROM node:26-slim AS build

WORKDIR /app

# Skip husky git hooks install (no .git in the build context)
ENV HUSKY=0

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: production dependencies only
FROM node:26-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HUSKY=0

COPY package*.json ./
# --ignore-scripts: the `prepare` script runs husky (a devDependency) which is not installed here
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

EXPOSE 8080

CMD ["node", "."]