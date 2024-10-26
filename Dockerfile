FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
RUN npm install -g typescript
RUN npm install @solana/web3.js@latest
RUN npm install telegram
RUN npm install googleapis@105 @google-cloud/local-auth@2.1.0 --save
RUN npm install axios@latest
RUN npm install --save-dev @types/axios@latest
RUN npm install express@latest

COPY src ./src

RUN npm run build

CMD ["npm", "start"]