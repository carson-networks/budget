# syntax=docker/dockerfile:1

# This stage is platform independent
FROM --platform=$BUILDPLATFORM node:24-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# The stock binary's file capability breaks startup under cap_drop: ALL.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
    && setcap -r /usr/bin/caddy \
    && addgroup -S app && adduser -S -G app -H -s /sbin/nologin app
USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
