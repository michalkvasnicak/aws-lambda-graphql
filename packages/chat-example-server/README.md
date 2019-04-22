# chat-example-server

## Install Serverless

Install `serverless` package system-wide via:

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

Update **LAMBDA_WEBSOCKET** inside `chat-example-app/src/index.tsx` with your new endpoint from serverless deployment.