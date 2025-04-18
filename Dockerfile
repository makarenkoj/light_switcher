# Dockerfile
FROM node:lts

WORKDIR /usr/src/app

COPY package*.json ./
COPY locales /usr/src/app/locales

RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "app.js"]

