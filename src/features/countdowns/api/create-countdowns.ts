import type { CountdownCreate, CountdownRead } from '@/api';
import { CountdownsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateCountdowns } from './query-keys';

export const createCountdown = async (data: CountdownCreate): Promise<CountdownRead> =>
    CountdownsService.createCountdownCountdownsPost(data);

export const useCreateCountdown = defineMutationHook(createCountdown, (queryClient) => {
    invalidateCountdowns(queryClient);
});
