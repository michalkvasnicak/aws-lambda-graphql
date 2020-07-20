import { GraphQLResolveInfo } from 'graphql';
import { $$asyncIterator } from 'iterall';
import { IContext, SubcribeResolveFn } from './types';

export type FilterFn = (
  rootValue?: any,
  args?: any,
  context?: IContext,
  info?: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

function withFilter(
  asyncIteratorFn: SubcribeResolveFn,
  filterFn: FilterFn,
): SubcribeResolveFn {
  return async (rootValue: any, args: any, context: any, info: any) => {
    const asyncIterator = await asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = (): Promise<any> => {
      return asyncIterator.next().then((payload) => {
        if (payload.done === true) {
          return payload;
        }

        return Promise.resolve(
          filterFn(payload.value, args, context, info),
        ).then((filterResult) => {
          if (filterResult === true) {
            return payload;
          }

          // Skip the current value and wait for the next one
          return getNextPromise();
        });
      });
    };

    return {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return!();
      },
      throw(error: any) {
        return asyncIterator.throw!(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    } as any;
  };
}

export { withFilter };

export default withFilter;
