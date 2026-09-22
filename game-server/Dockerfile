FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY game-server/package.json ./game-server/package.json
RUN npm install

COPY game-server ./game-server
COPY shared ./shared

WORKDIR /app/game-server
EXPOSE 4000
CMD ["npm", "run", "start"]