FROM oven/bun:1-alpine AS build-env
# react-router build must run under Node: with no node binary, bun runs it itself
# and resolves react-dom/server to server.bun.js, which lacks the
# renderToPipeableStream the prerender step calls.
RUN apk add --no-cache nodejs
COPY . /app/
WORKDIR /app
RUN bun install --frozen-lockfile
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
RUN bun run build

# SPA mode (ssr:false) emits only build/client, so the runtime image serves
# static files and ships no Node runtime and no node_modules. That is the whole
# point: react-router-serve idled at ~88MB and climbed under load, because V8
# sizes its heap from host RAM and never sees the container limit; nginx holds
# ~13MB flat.
FROM nginx:alpine
COPY --from=build-env /app/build/client /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# The entrypoint's envsubst pass would otherwise blank out nginx's own $uri and
# $host, since they look like shell variables. Pinning the filter to PORT means
# only ${PORT} in the template is substituted.
ENV NGINX_ENVSUBST_FILTER=^PORT$
ENV PORT=8080
EXPOSE 8080
