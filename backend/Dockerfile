FROM node:18-alpine

# --- AGREGAMOS ESTO: Instalamos OpenSSL para que Prisma funcione ---
RUN apk update && apk add openssl
# -------------------------------------------------------------------

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generamos el cliente de prisma
RUN npx prisma generate

EXPOSE 3000

# Script de inicio
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]