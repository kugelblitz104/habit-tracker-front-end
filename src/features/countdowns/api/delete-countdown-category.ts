import { CountdownCategoriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateCountdownCategories, invalidateCountdowns } from './query-keys';

export const deleteCountdownCategory = async (categoryId: number): Promise<unknown> =>
    CountdownCategoriesService.deleteCountdownCategoryCountdownCategoriesCategoryIdDelete(
        categoryId
    );

export const useDeleteCountdownCategory = defineMutationHook(
    deleteCountdownCategory,
    (queryClient) => {
        invalidateCountdownCategories(queryClient);
        invalidateCountdowns(queryClient);
    }
);
