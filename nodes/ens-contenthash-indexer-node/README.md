# ENS contenthash indexer node

The ENS contenthash indexer node is a node.js console app that can crawl/listen for all ENS contenthash records on the public ENS resolver and indexes them.

### Run with cloning the repo:
1. Clone the repo
2. Run "nvm install && nvm use"
3. Run "yarn" to install dependencies
3. Run "yarn build" to build the app
3. Run "yarn dev init" to initialize the node
5. Run "yarn dev {command}" to run the commands with ts-node

### The following commands are supported:
- `daemon`: starts a daemon
- `help`: Display help for command