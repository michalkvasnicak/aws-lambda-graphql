export function prefixRedisKey(key: string): string {
  return `aws-lambda-graphql:${key}`;
}
