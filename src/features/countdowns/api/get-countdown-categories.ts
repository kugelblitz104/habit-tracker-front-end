import type { CountdownCategoryList, CountdownCategoryRead } from '@/api';
import { CountdownCategoriesService } from '@/api';
import { fetchAllPages, PAGE_SIZE } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { countdownCategoryKeys } from './query-keys';

/**
 * Fetch a profile's countdown categories, all of them.
 *
 * The grouped views look a group's colour up by `category_id` from this list,
 * so a truncated page (the API's 100-row cap) would silently render a group
 * colourless rather than read as one page of many. `limit`/`offset` are
 * deliberately not caller-facing: paging is this function's business.
 */
export const getCountdownCategories = async (profileId: number): Promise<CountdownCategoryList> => {
    // No dedupeById: a category list fits in one page, so the multi-page
    // race getTasks guards against cannot occur here.
    const { items, total } = await fetchAllPages<CountdownCategoryRead>(
        async ({ offset, limit }) => {
            const page =
                await CountdownCategoriesService.listCountdownCategoriesCountdownCategoriesGet(
                    profileId,
                    limit,
                    offset
                );
            return { items: page.categories ?? [], total: page.total };
        }
    );

    // `limit` is the page size the walk asked for, not the row count it ended
    // up with; `total` already reports how many rows there are.
    return { categories: items, total, limit: PAGE_SIZE, offset: 0 };
};

export const getCountdownCategoriesQueryOptions = (profileId: number | null | undefined) =>
    queryOptions({
        queryKey: countdownCategoryKeys.list(profileId),
        queryFn: () => getCountdownCategories(profileId!),
        enabled: !!profileId
    });

type UseCountdownCategoriesOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getCountdownCategoriesQueryOptions>;
};

export const useCountdownCategories = ({ profileId, queryConfig }: UseCountdownCategoriesOptions) =>
    useQuery({
        ...getCountdownCategoriesQueryOptions(profileId),
        ...queryConfig
    });
