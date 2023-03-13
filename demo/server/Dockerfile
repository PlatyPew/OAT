FROM node:19-alpine

WORKDIR /opt/market

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install --omit=dev

COPY ./app.js .
COPY ./src ./src/

EXPOSE 3000

CMD ["npm", "run", "serve"]
