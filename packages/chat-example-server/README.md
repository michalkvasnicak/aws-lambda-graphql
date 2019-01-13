# chat-example-server

## Deploy

```console
yarn deploy
# or
npm run deploy
```

**After deploy you need to set up API Gateway V2 to able to listen to WebSocket, see below**

## 1. Create API

1. In the API Gateway console, choose **Create API**, **New API**.
2. Under **Choose the protocol**, choose **WebSocket**.
3. For **API name**, enter **Chat example server ws**.
4. For **Route Selection Expression**, enter `\$default`.
5. Enter a description if you’d like and click Create API.

## 2. Manage routes

1. In the API Gateway console, under **Chat example server ws**, choose **Routes**.

### 2.1. Connect route

⚠️ This route is need to register connection.

1. Choose **\$connect** in **Routes**
2. Set **Integration type** to **Lambda Function**
3. Check **Use Lambda Proxy integration**
4. In **Lambda Function** select deployed **chat-example-server**
5. Click **Save** and accept **Add Permission to Lambda Function**
6. Now **Add integration response** button appears, **Click it**
7. Done

### 2.2 Disconnect route

⚠️ This route is need to unregister connection.

1. Choose **\$disconnect** in **Routes**
2. Set **Integration type** to **Lambda Function**
3. Check **Use Lambda Proxy integration**
4. In **Lambda Function** select deployed **chat-example-server**
5. Click **Save** and accept **Add Permission to Lambda Function**
6. Now **Add integration response** button appears, **Click it**
7. Done

### 2.3 Message route

⚠️ This route is need so you can send operations to the GraphQL server.

1. Choose **\$default** in **Routes**
2. Set **Integration type** to **Lambda Function**
3. Check **Use Lambda Proxy integration**
4. In **Lambda Function** select deployed **chat-example-server**
5. Click **Save** and accept **Add Permission to Lambda Function**
6. Now **Add integration response** button appears, **Click it**
7. Done

## 3. Deploy API

1. In **Routes** click on **Actions** dropdown button
2. Click on **Deploy API**
3. In **Deploy API** modal choose **[New Stage]** under **Deployment stage**
4. As **Stage Name** type **development**
5. Copy **WebSocket URL** and use it in your application
6. Done
