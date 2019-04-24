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

Update **LAMBDA_WEBSOCKET** inside `chat-example-app/src/index.tsx` with your new endpoint from serverless deployment.
