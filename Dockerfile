FROM node:16-alpine3.16

WORKDIR /pocket-apm
RUN mkdir /pocket-apm/app
RUN mkdir /pocket-apm/conf

COPY ./dist/src /pocket-apm/app
COPY ./package.json /pocket-apm/app

RUN rm -rf /pocket-apm/app/config.js
RUN rm -rf /pocket-apm/app/config.js.map

COPY ./src/config.js /pocket-apm/conf

RUN cd /pocket-apm/app && npm install --omit=dev

EXPOSE 12700

ENV CONFIG="/pocket-apm/conf/config.js"

CMD [ "node", "/pocket-apm/app/index.js" ]