FROM node:18-alpine as BUILD

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

ARG API_ADDRESS
ARG PUBLIC_KEYS

ENV NEXT_PUBLIC_API_ADDRESS=$API_ADDRESS
ENV NEXT_PUBLIC_PUSH_PUBLIC_KEY=$PUBLIC_KEYS
ENV NODE_ENV=production
RUN npm run build

FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=BUILD /app/out /build
EXPOSE 80