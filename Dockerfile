FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./

# Vite exposes this public backend URL in the browser bundle at build time.
ARG VITE_TONGJI_STUDENT_BASE_URL
ENV VITE_TONGJI_STUDENT_BASE_URL=${VITE_TONGJI_STUDENT_BASE_URL}

RUN pnpm build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
