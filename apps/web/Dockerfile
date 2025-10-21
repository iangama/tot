FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve@14
COPY --from=build /app/dist ./dist
ENV PORT=5173
CMD ["serve","-s","dist","-l","5173"]
