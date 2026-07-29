import type { CountdownRead, CountdownUpdate } from '@/api';
import { CountdownsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
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

export const useUpdateCountdown = defineMutationHook(updateCountdown, (queryClient) => {
    invalidateCountdowns(queryClient);
});
