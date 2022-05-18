---
title: Installation
---

# Installation

```console
yarn add aws-lambda-graphql graphql graphql-subscriptions aws-sdk
# or
npm install aws-lambda-graphql graphql graphql-subscriptions aws-sdk
```

{% hint style="info" %}
Note that `aws-sdk` is required only for local development, it's available in AWS Lambda environment by default when you deploy the app.
{% endhint %}

Now when we've our dependencies in place, we can go through our first real-time GraphQL service.
