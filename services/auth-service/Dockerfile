FROM node:20-alpine
WORKDIR /app

# OpenSSL opcional (silencia warning em algumas versões)
RUN apk add --no-cache openssl

COPY package.json ./
# instala COM devDependencies para poder rodar "npx prisma generate"
RUN npm ci || npm install

COPY prisma ./prisma
RUN npx prisma generate

# copia o server e remove devDependencies para ficar enxuto em produção
COPY server.js .
RUN npm prune --omit=dev

ENV NODE_ENV=production
CMD ["node","server.js"]
