### Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
RUN npm ci --silent
RUN npm run build

### Production stage - serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Remove default config and use container's default server (serves static files)
COPY deploy/nginx_frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
