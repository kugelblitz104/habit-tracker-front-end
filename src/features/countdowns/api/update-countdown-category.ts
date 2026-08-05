import type { CountdownCategoryRead, CountdownCategoryUpdate } from '@/api';
import { CountdownCategoriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateCountdownCategories, invalidateCountdowns } from './query-keys';

export type UpdateCountdownCategoryInput = {
    categoryId: number;
    data: CountdownCategoryUpdate;
};

export const updateCountdownCategory = async ({
    categoryId,
    data
}: UpdateCountdownCategoryInput): Promise<CountdownCategoryRead> =>
    CountdownCategoriesService.patchCountdownCategoryCountdownCategoriesCategoryIdPatch(
        categoryId,
        data
    );

export const useUpdateCountdownCategory = defineMutationHook(
    updateCountdownCategory,
    (queryClient) => {
        invalidateCountdownCategories(queryClient);
        invalidateCountdowns(queryClient);
    }
);
