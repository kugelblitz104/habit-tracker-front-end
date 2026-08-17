import type { CountdownCategoryList, CountdownCategoryRead } from '@/api';
import { CountdownCategoriesService } from '@/api';
import { pagedList } from '@/lib/paginate';
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
    const { items, ...envelope } = await pagedList<CountdownCategoryRead>(
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

    return { categories: items, ...envelope };
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
