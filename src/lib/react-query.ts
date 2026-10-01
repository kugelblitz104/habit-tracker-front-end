import type { DefaultOptions, Query, UseMutationOptions } from '@tanstack/react-query';
import { MutationCache, QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

export const queryConfig = {
    queries: {
        // throwOnError: true,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 1000 * 60
    }
} satisfies DefaultOptions;

/**
 * The app's QueryClient. Every successful mutation first restarts any query
 * whose first load is still in flight: that fetch began before the mutation
 * committed, and `invalidateQueries` reuses it rather than starting a new one
 * when the query has no data yet, so the page would settle on pre-mutation rows.
 */
export const createQueryClient = (): QueryClient => {
    const queryClient: QueryClient = new QueryClient({
        defaultOptions: queryConfig,
        mutationCache: new MutationCache({
            onSuccess: async () => {
                const inFlight = queryClient.getQueryCache().findAll({
                    predicate: (q) =>
                        q.state.data === undefined && q.state.fetchStatus === 'fetching'
                });
                if (inFlight.length === 0) return;
                const filters = { predicate: (q: Query) => inFlight.includes(q) };
                await queryClient.cancelQueries(filters);
                void queryClient.refetchQueries({ ...filters, type: 'active' });
            }
        })
    });
    return queryClient;
};

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> = Awaited<
    ReturnType<FnType>
>;

export type QueryConfig<T extends (...args: any[]) => any> = Omit<
    ReturnType<T>,
    'queryKey' | 'queryFn'
>;

export type MutationConfig<MutationFnType extends (...args: any) => Promise<any>> =
    UseMutationOptions<ApiFnReturnType<MutationFnType>, Error, Parameters<MutationFnType>[0]>;

/**
 * Factory for the `useX` mutation hook shape repeated across `features/*\/api/`:
 * run `mutationFn`, invalidate some caches on success, then forward every
 * argument TanStack passes to `onSuccess` (data, variables, context, ...) to
 * the caller's own `onSuccess` untouched.
 */
export const defineMutationHook = <MutationFnType extends (...args: any) => Promise<any>>(
    mutationFn: MutationFnType,
    invalidate: (
        queryClient: QueryClient,
        data: ApiFnReturnType<MutationFnType>,
        variables: Parameters<MutationFnType>[0]
    ) => void
) => {
    type UseXOptions = { mutationConfig?: MutationConfig<MutationFnType> };
    return ({ mutationConfig }: UseXOptions = {}) => {
        const queryClient = useQueryClient();
        const { onSuccess, ...restConfig } = mutationConfig ?? {};
        return useMutation({
            mutationFn,
            onSuccess: (...args: Parameters<NonNullable<typeof onSuccess>>) => {
                invalidate(queryClient, args[0], args[1]);
                onSuccess?.(...args);
            },
            ...restConfig
        });
    };
};
