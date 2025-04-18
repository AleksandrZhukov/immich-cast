FROM --platform=linux/amd64 node:20.12-alpine

RUN apk add --no-cache tzdata

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY src/ ./src/

ENV PORT=2284
RUN npm run build

EXPOSE ${PORT}

CMD ["npm", "run", "api"]