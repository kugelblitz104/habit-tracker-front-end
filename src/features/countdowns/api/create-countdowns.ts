import type { CountdownCreate, CountdownRead } from '@/api';
import { CountdownsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCountdowns } from './query-keys';

export const createCountdown = async (data: CountdownCreate): Promise<CountdownRead> =>
    CountdownsService.createCountdownCountdownsPost(data);

type UseCreateCountdownOptions = {
    mutationConfig?: MutationConfig<typeof createCountdown>;
};

export const useCreateCountdown = ({ mutationConfig }: UseCreateCountdownOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createCountdown,
        onSuccess: (...args) => {
            invalidateCountdowns(queryClient);
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
