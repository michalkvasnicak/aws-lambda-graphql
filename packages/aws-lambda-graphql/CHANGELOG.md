# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0-alpha.24 (2021-12-21)

- chore: add visibility into the dynamodb event processor (#158) ([0e723bb](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/0e723bb)), closes [#158](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/158)

## 1.0.0-alpha.23 (2021-07-02)

- feat(modularity): allow inject log fn in handler (#149) ([57614bd](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/57614bd)), closes [#149](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/149)
- Just fixing some typos in README (#142) ([4a2e826](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/4a2e826)), closes [#142](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/142)

## 1.0.0-alpha.22 (2021-03-14)

- feat: update graphql (#138) ([05e8a71](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/05e8a71)), closes [#138](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/138)

## 1.0.0-alpha.21 (2021-01-22)

- fix: handle connection_terminate in \$default route to avoid throw error (#132) ([23e715b](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/23e715b)), closes [#132](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/132)

## 1.0.0-alpha.20 (2021-01-18)

- feat: support multiple subscriptions per event and connection ([512bde8](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/512bde8))

## 1.0.0-alpha.19 (2020-11-13)

- Allow changing subscription name (#123) ([211ace8](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/211ace8)), closes [#123](https://github.com/michalkvasnicak/aws-lambda-graphql/issues/123)

## 1.0.0-alpha.18 (2020-09-18)

- fix: correctly paginate through subscriptions ([ad76624](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/ad76624))

## 1.0.0-alpha.17 (2020-09-10)

- feat: add debug mode to console.log some events ([d382cde](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/d382cde))

## 1.0.0-alpha.16 (2020-08-24)

- feat: added `connectionEndpoint` parameter to `subscriptionOptions` ([54b59fc](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/54b59fc))

## 1.0.0-alpha.15 (2020-08-17)

- feat: validate constructor options ([47cd7fe](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/47cd7fe))

## 1.0.0-alpha.14 (2020-08-11)

- feat(tests): add tests for onWebsocketConnect ([e5f1246](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/e5f1246))
- fix(test): fix existing tests ([b22dd7b](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/b22dd7b))
- add onWebsocketConnect handler ([06d074f](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/06d074f))
- prettier format ([bfb2e96](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/bfb2e96))
- remove unnecessary responses ([397326c](https://github.com/michalkvasnicak/aws-lambda-graphql/commit/397326c))

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
