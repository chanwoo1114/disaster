FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
# Windows에서 생성된 package-lock.json을 npm ci로 설치하면 플랫폼별
# optional dependency(rollup 리눅스 네이티브 바이너리)가 누락되는 npm 버그가
# 있어, lockfile 없이 컨테이너 플랫폼에 맞게 fresh install 한다.
RUN npm install

COPY . .

ARG VITE_VWORLD_API_KEY
ARG VITE_BACKEND_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
