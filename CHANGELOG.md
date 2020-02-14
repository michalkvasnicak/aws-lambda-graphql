# Changelog

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@michalkvasnicak](https://github.com/michalkvasnicak) did it.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## `aws-lambda-graphql`

### [Unreleased](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@1.0.0-alpha.3...HEAD)

### [v1.0.0-alpha.3](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@1.0.0-alpha.3...HEAD)

#### Fixed

- Fixed missing connection when in serverless-offline environment. Added retry logic to wait for connection to be hydrated by [@nenti](https://github.com/nenti) see [#68](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/68)

### [v1.0.0-alpha.2](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@1.0.0-alpha.2...aws-lambda-graphql@1.0.0-alpha.3)

#### Fixed

- Fixed missing connection GraphQL context data in Event processor by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy), see [#63](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/63)

#### Added

- Added getters for connection and subscription managers to Server by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy), see [#63](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/63)

### [v1.0.0-alpha.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@1.0.0-alpha.1...aws-lambda-graphql@1.0.0-alpha.2)

#### Fixed

- Limit the number of request items sent to DynamoDB when cleaning up stale connections by [@alvinypyim](https://github.com/alvinypyim), see [#61](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/61).

### [v1.0.0-alpha.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@1.0.0-alpha.0...aws-lambda-graphql@1.0.0-alpha.1)

#### Breaking changes

- added `Server` as base implementation to be used instead of `createHttpHandler, createWsHandler etc`, see [#59](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/59)
  - uses [`apollo-server-lambda`](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-lambda) as underlying implementation for HTTP handling
  - removed legacy protocol support, please use only Client from [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws).

### [v0.13.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.12.3...aws-lambda-graphql@0.13.0) - 2019-12-12

#### Added

- Added TTL support to `DynamoDBEventStore` (see [#53](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/53))

### [v0.12.3](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.12.2...aws-lambda-graphql@0.12.3) - 2019-12-04

#### Fixed

- Do not allow to publish an event with empty name (see [#52](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/52))

### [v0.12.2](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.12.1...aws-lambda-graphql@0.12.2) - 2019-12-04

#### Fixed

- Return proper response on websocket disconnect (see [#51](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/51))

### [v0.12.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.12.0...aws-lambda-graphql@0.12.1) - 2019-11-27

#### Fixed

- Serialize DynamoDB event's payload to JSON by [@seanchambo](https://github.com/seanchambo) (see [#46](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/46))

### [v0.12.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.11.0...aws-lambda-graphql@0.12.0) - 2019-11-22

#### Added

- Provide connection context to context builder function by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy) (see [#43](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/43))

### [v0.11.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.10.0...aws-lambda-graphql@0.11.0) - 2019-11-17

#### Added

- Wait for connection to be initialized (see [#40](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/40))

### [v0.10.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.9.1...aws-lambda-graphql@0.10.0) - 2019-11-08

#### Added

- Added support for context in event processors (see [#36](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/36))

### [v0.9.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.9.0...aws-lambda-graphql@0.9.1) - 2019-11-03

#### Fixed

- Normalize headers to lower case (see [#32](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/32))

### [v0.9.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.8.1...aws-lambda-graphql@0.9.0) - 2019-11-01

#### Added

- Support for server lifecycle methods by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy) (see [#29](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/29))

### [v0.8.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.8.0...aws-lambda-graphql@0.8.1) - 2019-10-07

### [v0.8.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.7.2...aws-lambda-graphql@0.8.0) - 2019-10-03

#### Added

- Apollo Subscription Transport support by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy) (see [#27](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/27))

### [v0.7.2](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.7.1...aws-lambda-graphql@0.7.2) - 2019-09-29

#### Fixed

- Fixed empty result for DynamoDB subscriptions scan by [@AlpacaGoesCrazy](https://github.com/AlpacaGoesCrazy) (see [#26](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/26))

### [v0.7.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.7.0...aws-lambda-graphql@0.7.1) - 2019-09-17

#### Fixed

- Fixed processing operations on connection reconnect by [@sammarks](https://github.com/sammarks) (see [#26](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/25))

### [v0.7.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.6.0...aws-lambda-graphql@0.7.0) - 2019-08-07

#### Added

- Added AWS Lambda's context to GraphQL context (see [#23](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/23))

### [v0.6.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.5.0...aws-lambda-graphql@0.6.0) - 2019-06-14

#### Added

- Added a way to unsubscribe client from specific subscription (see [#18](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/18))

### [v0.5.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.4.0...aws-lambda-graphql@0.5.0) - 2019-06-12

#### Changed

- Use incremental id generation for operations (see [#17](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/17))

### [v0.4.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.3.1...aws-lambda-graphql@0.4.0) - 2019-06-11

#### Added

- Replaced `ulid` by `uuid` and added support for custom id generators

### [v0.3.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.3.0...aws-lambda-graphql@0.3.1) - 2019-06-04

#### Fixed

- Add support for context creator (see [#14](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/14))

### [v0.3.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.2.1...aws-lambda-graphql@0.3.0) - 2019-06-04

#### Added

- Added support for custom context and added an AWS Lambda event to resolvers (see [#13](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/13))

### [v0.2.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-graphql@0.2.0...aws-lambda-graphql@0.2.1) - 2019-05-29

### [v0.2.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/v0.1.0...aws-lambda-graphql@0.2.0) - 2019-05-29

#### Added

- Added `serverless.yml` deployment instead of cloudformation template by [@guerrerocarlos](https://github.com/guerrerocarlos) (see [#8](https://github.com/michalkvasnicak/aws-lambda-graphql/pull/8))
- Added support for `validationRules`

#### Fixed

- unregistering all subscriptions on connection deletion

### [v0.1.0](https://github.com/michalkvasnicak/aws-lambda-graphql/releases/tag/v0.1.0) - 2019-01-13

## `aws-lambda-ws-link` **⚠️ Deprecated, do not use with versions newer that `0.13.0`**

### [Unreleased](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.13.0...HEAD)

### [v0.13.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.12.1...aws-lambda-ws-link@0.13.0) - 2019-12-12

#### Changed

- Updated `aws-lamba-graphql` version to `0.13.0`

### [v0.12.3](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.12.2...aws-lambda-ws-link@0.12.3) - 2019-12-04

#### Changed

- Updated `aws-lamba-graphql` version to `0.12.3`

### [v0.12.2](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.12.1...aws-lambda-ws-link@0.12.2) - 2019-12-04

#### Changed

- Updated `aws-lamba-graphql` version to `0.12.2`

### [v0.12.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.12.0...aws-lambda-ws-link@0.12.1) - 2019-11-27

#### Changed

- Updated `aws-lamba-graphql` version to `0.12.1`

### [v0.12.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.11.0...aws-lambda-ws-link@0.12.0) - 2019-11-22

#### Changed

- Updated `aws-lamba-graphql` version to `0.12.0`

### [v0.11.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.10.0...aws-lambda-ws-link@0.11.0) - 2019-11-17

#### Changed

- Updated `aws-lamba-graphql` version to `0.11.0`

### [v0.10.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.9.1...aws-lambda-ws-link@0.10.0) - 2019-11-08

#### Changed

- Updated `aws-lamba-graphql` version to `0.10.0`

### [v0.9.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.9.0...aws-lambda-ws-link@0.9.1) - 2019-11-03

#### Changed

- Updated `aws-lamba-graphql` version to `0.9.1`

### [v0.9.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.8.1...aws-lambda-ws-link@0.9.0) - 2019-11-01

#### Changed

- Updated `aws-lamba-graphql` version to `0.9.0`

### [v0.8.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.8.0...aws-lambda-ws-link@0.8.1) - 2019-10-07

#### Changed

- Updated `aws-lamba-graphql` version to `0.8.1`

### [v0.8.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.7.2...aws-lambda-ws-link@0.8.0) - 2019-10-03

#### Changed

- Updated `aws-lamba-graphql` version to `0.8.0`

### [v0.7.2](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.7.1...aws-lambda-ws-link@0.7.2) - 2019-09-29

#### Changed

- Updated `aws-lamba-graphql` version to `0.7.2`

### [v0.7.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.7.0...aws-lambda-ws-link@0.7.1) - 2019-09-17

#### Changed

- Updated `aws-lamba-graphql` version to `0.7.1`

### [v0.7.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.6.0...aws-lambda-ws-link@0.7.0) - 2019-08-07

#### Changed

- Updated `aws-lamba-graphql` version to `0.7.0`

### [v0.6.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.5.0...aws-lambda-ws-link@0.6.0) - 2019-06-14

#### Changed

- Updated `aws-lamba-graphql` version to `0.6.0`

### [v0.5.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.4.0...aws-lambda-ws-link@0.5.0) - 2019-06-12

#### Changed

- Updated `aws-lamba-graphql` version to `0.5.0`

### [v0.4.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.3.1...aws-lambda-ws-link@0.4.0) - 2019-06-11

#### Changed

- Updated `aws-lamba-graphql` version to `0.4.0`

### [v0.3.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.3.0...aws-lambda-ws-link@0.3.1) - 2019-06-04

#### Changed

- Updated `aws-lamba-graphql` version to `0.3.1`

### [v0.3.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.2.1...aws-lambda-ws-link@0.3.0) - 2019-06-04

#### Changed

- Updated `aws-lamba-graphql` version to `0.3.0`

### [v0.2.1](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/aws-lambda-ws-link@0.2.0...aws-lambda-ws-link@0.2.1) - 2019-05-29

#### Changed

- Updated `aws-lamba-graphql` version to `0.2.1`

### [v0.2.0](https://github.com/michalkvasnicak/aws-lambda-graphql/compare/v0.1.0...aws-lambda-ws-link@0.2.0) - 2019-05-29

#### Changed

- Updated `aws-lamba-graphql` version to `0.2.0`

### [v0.1.0](https://github.com/michalkvasnicak/aws-lambda-graphql/releases/tag/v0.1.0) - 2019-01-13
