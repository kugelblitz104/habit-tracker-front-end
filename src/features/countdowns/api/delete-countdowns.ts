import { CountdownsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCountdowns } from './query-keys';

export const deleteCountdown = async (countdownId: number): Promise<unknown> =>
    CountdownsService.deleteCountdownCountdownsCountdownIdDelete(countdownId);

type UseDeleteCountdownOptions = {
    mutationConfig?: MutationConfig<typeof deleteCountdown>;
};

export const useDeleteCountdown = ({ mutationConfig }: UseDeleteCountdownOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteCountdown,
        onSuccess: (...args) => {
            invalidateCountdowns(queryClient);
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
