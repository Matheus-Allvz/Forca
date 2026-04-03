FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY controller/package.json ./controller/package.json
RUN npm install

COPY controller ./controller
COPY web-client ./web-client
COPY shared ./shared

WORKDIR /app/controller
EXPOSE 3000
CMD ["npm", "run", "start"]