# chat-example-server

## How to use

### Build all packages

Run following command in project root

```console
yarn build
```

### Install dependencies

In `chat-example-server` directory run following command

```console
yarn install
```

### Local development

For local development we'll use serverless-offline, serverless-dynamodb-local

#### 1. Install local dynamodb

If you run this for the first time, please install local dynamodb first using `yarn install:dynamodb` command.

#### 2. Start local chat example server

```console
yarn start
```

### Deploy

```console
yarn deploy
# or
npm run deploy
```

#### Update websocket lambda uri in example app

Update **REACT_APP_LAMBDA_WEBSOCKET_URI** inside `chat-example-app/.env` with your new endpoint from serverless deployment.
