#!/bin/sh
staging=~/staging
hosting=~/hosting
data=~/data

persistenceNode=polywrap/nodes/nodes/persistence-node
ensIndexerNode=polywrap/nodes/nodes/ens-contenthash-indexer-node
ensTextRecordIndexer=polywrap/nodes/nodes/ens-text-record-indexer
persistenceNodePort=8081
ensIndexerNodeMainnetPort=8082
ensIndexerNodeGoerliPort=8085
ensTextRecordIndexerMainnetPort=8086
ensTextRecordIndexerGoerliPort=8087
startingBlockMainnet=0
startingBlockGoerli=0

export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

npm config set prefix '~/.npm-global'
echo "export PATH=~/.npm-global/bin:\$PATH" >> ~/.profile
source ~/.profile

pm2 delete persistence-node
pm2 delete ens-indexer-node-mainnet
pm2 delete ens-indexer-node-goerli
pm2 delete ens-text-record-indexer-mainnet
pm2 delete ens-text-record-indexer-goerli

set -e

# rm $data/persistence-node/config.json
# rm $data/persistence-node -rf
# rm $data/ens-indexer-node/mainnet -rf
# rm $data/ens-indexer-node/goerli -rf
# rm $data/ens-text-record-indexer/mainnet -rf
# rm $data/ens-text-record-indexer/goerli -rf

mkdir -p $hosting/$persistenceNode
cd $hosting/$persistenceNode
cp -r $staging/$persistenceNode/bin ./
cp -r $staging/$persistenceNode/node_modules ./

mkdir -p $hosting/$ensIndexerNode
cd $hosting/$ensIndexerNode
cp -r $staging/$ensIndexerNode/bin ./
cp -r $staging/$ensIndexerNode/node_modules ./

mkdir -p $hosting/$ensTextRecordIndexer
cd $hosting/$ensTextRecordIndexer
cp -r $staging/$ensTextRecordIndexer/bin ./
cp -r $staging/$ensTextRecordIndexer/node_modules ./

# node $hosting/$persistenceNode/bin/main.js init --data $data/persistence-node --log
# node $hosting/$ensIndexerNode/bin/main.js init --data $data/ens-indexer-node/mainnet --network mainnet --log
# node $hosting/$ensIndexerNode/bin/main.js init --sdata $data/ens-indexer-node/goerli --network goerli --log
# node $hosting/$ensTextRecordIndexer/bin/main.js init --data $data/ens-text-record-indexer/mainnet --network mainnet --log
# node $hosting/$ensTextRecordIndexer/bin/main.js init --data $data/ens-text-record-indexer/goerli --network goerli --log

pm2 start $hosting/$persistenceNode/bin/main.js --name persistence-node -- daemon --data $data/persistence-node --gateway-port $persistenceNodePort --log --purge-invalid-wrappers
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-mainnet -- daemon --data $data/ens-indexer-node/mainnet --port $ensIndexerNodeMainnetPort -b $startingBlockMainnet --log
pm2 start $hosting/$ensIndexerNode/bin/main.js --name ens-indexer-node-goerli -- daemon --data $data/ens-indexer-node/goerli --port $ensIndexerNodeGoerliPort -b $startingBlockGoerli --log
pm2 start $hosting/$ensTextRecordIndexer/bin/main.js --name ens-text-record-indexer-mainnet -- daemon --data $data/ens-text-record-indexer/mainnet --port $ensTextRecordIndexerMainnetPort -b $startingBlockMainnet --log
pm2 start $hosting/$ensTextRecordIndexer/bin/main.js --name ens-text-record-indexer-goerli -- daemon --data $data/ens-text-record-indexer/goerli --port $ensTextRecordIndexerGoerliPort -b $startingBlockGoerli --log

pm2 save