#Docker container for Hermes

FROM node:boron

RUN npm install pm2 -g 

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

ARG EX_PORT=8081
EXPOSE $EX_PORT

CMD ["pm2-docker", "app.js"] 
