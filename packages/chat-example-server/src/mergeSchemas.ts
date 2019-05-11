import { GraphQLObjectType, GraphQLSchema, GraphQLSchemaConfig } from 'graphql';

export function mergeSchemas({ schemas }) {
  return new GraphQLSchema(['query', 'mutation', 'subscription'].reduce(
    function(schemaAcc, schemaCur) {
      schemaAcc[schemaCur] = new GraphQLObjectType({
        name: `Root${schemaCur.charAt(0).toUpperCase() + schemaCur.slice(1)}Type`,
        fields: schemas
          .filter(s => s[`_${schemaCur}Type`])
          .map(s => s[`_${schemaCur}Type`])
          .reduce((schAcc, schemaRoot) => {
            schAcc = Object.assign(schAcc, schemaRoot._fields || {});
            return Object.keys(schemaRoot._fields).reduce((acc, cur) => {
              acc[cur] = Object.assign(acc[cur] || {}, {
                args: schemaRoot._fields[cur].args.reduce(
                  (argsAcc, argsCur) => {
                    argsAcc[argsCur.name] = argsCur;
                    return argsAcc;
                  },
                  {},
                ),
              });
              delete acc[cur]['isDeprecated'];
              return acc;
            }, schAcc);
          }, {}),
      });
      return schemaAcc;
    }, {},) as GraphQLSchemaConfig) 
}
