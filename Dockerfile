FROM node:18-alpine as BUILD

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=BUILD /app/out /build
EXPOSE 80