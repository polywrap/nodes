#!/bin/sh

pm2 delete all

cd /home/ubuntu/polywrap/nodes/nodes/persistence-node
yarn
yarn build
curl -o- https://raw.githubusercontent.com/nerfZael/persistence-scripts/main/.env > .env

pm2 start ipfs --max-memory-restart 900M -- daemon
node bin/main.js past -b 500000 --log
pm2 start bin/main.js -- daemon --http 8081 --log

pm2 startup
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v16.13.0/bin /home/ubuntu/.npm-global/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

pm2 save