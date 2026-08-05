import type { CountdownCategoryCreate, CountdownCategoryRead } from '@/api';
import { CountdownCategoriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateCountdownCategories, invalidateCountdowns } from './query-keys';

export const createCountdownCategory = async (
    data: CountdownCategoryCreate
): Promise<CountdownCategoryRead> =>
    CountdownCategoriesService.createCountdownCategoryCountdownCategoriesPost(data);

export const useCreateCountdownCategory = defineMutationHook(
    createCountdownCategory,
    (queryClient) => {
        invalidateCountdownCategories(queryClient);
        invalidateCountdowns(queryClient);
    }
);
