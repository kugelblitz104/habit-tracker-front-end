import type { CountdownRead, CountdownUpdate } from '@/api';
import { CountdownsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCountdowns } from './query-keys';

export type UpdateCountdownInput = {
    countdownId: number;
    data: CountdownUpdate;
};

export const updateCountdown = async ({
    countdownId,
    data
}: UpdateCountdownInput): Promise<CountdownRead> =>
    CountdownsService.patchCountdownCountdownsCountdownIdPatch(countdownId, data);

type UseUpdateCountdownOptions = {
    mutationConfig?: MutationConfig<typeof updateCountdown>;
};

export const useUpdateCountdown = ({ mutationConfig }: UseUpdateCountdownOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateCountdown,
        onSuccess: (...args) => {
            invalidateCountdowns(queryClient);
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
