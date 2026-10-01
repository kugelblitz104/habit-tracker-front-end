import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from './react-query';

describe('createQueryClient', () => {
    it('a mutation that lands during a first load refetches instead of keeping the pre-mutation read', async () => {
        const queryClient = createQueryClient();
        const resolvers: ((rows: string) => void)[] = [];
        const observer = new QueryObserver(queryClient, {
            queryKey: ['rows'],
            queryFn: () => new Promise<string>((resolve) => resolvers.push(resolve))
        });
        const unsubscribe = observer.subscribe(() => {});
        expect(resolvers).toHaveLength(1);

        await new MutationObserver(queryClient, {
            mutationFn: async () => 'deleted',
            onSuccess: () => {
                void queryClient.invalidateQueries({ queryKey: ['rows'] });
            }
        }).mutate();

        expect(resolvers).toHaveLength(2);
        resolvers[0]!('before delete');
        resolvers[1]!('after delete');
        await vi.waitFor(() => expect(queryClient.getQueryData(['rows'])).toBe('after delete'));
        unsubscribe();
    });
});
