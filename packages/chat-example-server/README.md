# chat-example-server

## Install Serverless

Install `serverless` package system-wide via:

(Make sure you have serverless v1.38 or later)

```bash
npm install -g serverless
```

## Deploy

```console
yarn deploy
# or
npm run deploy
```

## Update

Update **REACT_APP_LAMBDA_WEBSOCKET_URI** inside `chat-example-app/.env` with your new endpoint from serverless deployment.
