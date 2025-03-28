# Dockerfile
FROM node:lts

WORKDIR /usr/src/app

COPY package*.json ./
COPY locales /usr/src/app/locales

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]

