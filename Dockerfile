# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e

# This stage is platform independent
FROM --platform=$BUILDPLATFORM node:24-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN node -e 'const v = process.env.VITE_API_URL; if (v && new URL(v).origin !== v) { console.error(`VITE_API_URL must be a bare origin like https://api.example.com, got: ${v}`); process.exit(1); }' \
    && pnpm run build

FROM caddy:2-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# The stock binary's file capability breaks startup under cap_drop: ALL.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
    && setcap -r /usr/bin/caddy \
    && addgroup -S app && adduser -S -G app -H -s /sbin/nologin app
USER app
EXPOSE 8080

# Derived from the same build arg as the bundle so the CSP always allows the API it calls.
ARG VITE_API_URL
ENV CSP_CONNECT_SRC=${VITE_API_URL}

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
