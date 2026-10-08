ARG NODE_VERSION=24.16.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app/src/logs

COPY package*.json ./

RUN npm install --omit=dev
COPY --chown=node:node . .

RUN mkdir -p src/logs && chown -R node:node /usr/src/app

USER node

EXPOSE 3610

CMD ["npm", "start"]

