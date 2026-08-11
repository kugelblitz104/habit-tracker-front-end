FROM node:20-alpine AS build-env
COPY . /app/
WORKDIR /app
RUN npm ci
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
RUN npm run build

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
