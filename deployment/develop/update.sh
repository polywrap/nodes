#!/bin/sh
staging=~/staging
hosting=~/hosting
data=~/data

persistenceNode=polywrap/nodes/nodes/persistence-node
ensIndexerNode=polywrap/nodes/nodes/ens-contenthash-indexer-node
persistenceNodePort=8081
ensIndexerNodeMainnetPort=8082
ensIndexerNodeRopstenPort=8083
ensIndexerNodeRinkebyPort=8084
ensIndexerNodeGoerliPort=8085
startingBlockMainnet=0
startingBlockRopsten=0
startingBlockRinkeby=0
startingBlockGoerli=0

export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

npm config set prefix '~/.npm-global'
echo "export PATH=~/.npm-global/bin:\$PATH" >> ~/.profile
source ~/.profile

pm2 delete persistence-node
pm2 delete ens-indexer-node-mainnet
pm2 delete ens-indexer-node-ropsten
pm2 delete ens-indexer-node-rinkeby
pm2 delete ens-indexer-node-goerli

set -e

rm $data/persistence-node/config.json
# rm $data/persistence-node -rf
# rm $data/ens-indexer-node/mainnet -rf
# rm $data/ens-indexer-node/ropsten -rf
# rm $data/ens-indexer-node/rinkeby -rf
# rm $data/ens-indexer-node/goerli -rf

cd $hosting/$persistenceNode
cp -r $staging/$persistenceNode/bin ./
cp -r $staging/$persistenceNode/node_modules ./

cd $hosting/$ensIndexerNode
cp -r $staging/$ensIndexerNode/bin ./
cp -r $staging/$ensIndexerNode/node_modules ./

node $hosting/$persistenceNode/bin/main.js init --data $data/persistence-node --log
# node $hosting/$ensIndexerNode/bin/main.js init --data $data/ens-indexer-node/mainnet --network mainnet --log
# node $hosting/$ensIndexerNode/bin/main.js init --data $data/ens-indexer-node/ropsten --network ropsten --log
# node $hosting/$ensIndexerNode/bin/main.js init --data $data/ens-indexer-node/rinkeby --network rinkeby --log
node $hosting/$ensIndexerNode/bin/main.js init --data $data/ens-indexer-node/goerli --network goerli --log

pm2 start $hosting/$persistenceNode/bin/main.js --name persistence-node -- daemon --data $data/persistence-node --gateway-port $persistenceNodePort --log --purge-invalid-wrappers
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-mainnet -- daemon --data $data/ens-indexer-node/mainnet --port $ensIndexerNodeMainnetPort -b $startingBlockMainnet --log
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-ropsten -- daemon --data $data/ens-indexer-node/ropsten --port $ensIndexerNodeRopstenPort -b $startingBlockRopsten --log
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-rinkeby -- daemon --data $data/ens-indexer-node/rinkeby --port $ensIndexerNodeRinkebyPort -b $startingBlockRinkeby --log
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-goerli -- daemon --data $data/ens-indexer-node/goerli --port $ensIndexerNodeGoerliPort -b $startingBlockGoerli --log

pm2 save