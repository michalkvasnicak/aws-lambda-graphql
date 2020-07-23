# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0-alpha.13 (2020-07-23)

- fix: check sec-websocket-protocol only if provided (#101) ([79f3c6c](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/79f3c6c)), closes [#101](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/101)

## 1.0.0-alpha.12 (2020-07-21)

- fix: remove multiValueHeader not supported by WebSocket (#98) ([214a4bd](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/214a4bd)), closes [#98](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/98)

## 1.0.0-alpha.11 (2020-07-21)

- feat: remove multiple headers not support by websocket ([47cd86e](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/47cd86e))

## 1.0.0-alpha.10 (2020-07-21)

- feat: pass Sec-WebSocket-Protocol headers during connect phase ([a1261fa](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/a1261fa))

## 1.0.0-alpha.9 (2020-07-14)

- feat: filter out ddb expired connections/subscriptions/events ([d826725](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/d826725))

## 1.0.0-alpha.8 (2020-07-06)

- feat: ttl support for dynamodb connections and subscriptions ([35d35b7](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/35d35b7))

## 1.0.0-alpha.7 (2020-06-19)

- feat: subscription and connection managers for ioredis ([1f10537](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/1f10537))

## 1.0.0-alpha.6 (2020-06-09)

- fix(server): respond with 'Sec-WebSocket-Protocol' header on connect when requested ([85cdb7d](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/85cdb7d))

## 1.0.0-alpha.5 (2020-05-26)

- feat: make JSON serialization optional ([ba5c839](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/ba5c839))
