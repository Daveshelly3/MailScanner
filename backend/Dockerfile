FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .
RUN npx prisma generate

EXPOSE 3001
CMD ["node", "src/index.js"]
