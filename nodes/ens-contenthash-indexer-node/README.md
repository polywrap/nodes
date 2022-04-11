# ENS contenthash indexer node

The ENS contenthash indexer node is a node.js console app that can crawl/listen for all ENS contenthash records on the public ENS resolver and indexes them.

### Run with cloning the repo:
1. Clone the repo
2. Run "nvm install && nvm use"
3. Run "yarn" to install dependencies
4. Run "yarn build" to build the app
5. Run "yarn dev-init" to initialize the node with dev configuration
6. Run "yarn dev daemon" to run the node with dev configuration
7. Run "yarn dev {command}" to run the commands with ts-node

### The following commands are supported:
- `init`: initializes the node
- `daemon`: starts a daemon
- `help`: Display help for command