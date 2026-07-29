import { CountdownsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateCountdowns } from './query-keys';

export const deleteCountdown = async (countdownId: number): Promise<unknown> =>
    CountdownsService.deleteCountdownCountdownsCountdownIdDelete(countdownId);

export const useDeleteCountdown = defineMutationHook(deleteCountdown, (queryClient) => {
    invalidateCountdowns(queryClient);
});
