import type { UseQueryResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

export type SlugResolution = {
    /** The resolved row's id, or null while pending / when nothing matched. */
    id: number | null;
    isPending: boolean;
    /** Settled with no match, so the caller should render a not-found state. */
    notFound: boolean;
};

/**
 * Turn a by-slug query into the id its detail surface needs, and seed the by-id
 * cache with the row it already fetched.
 *
 * Shared by the task, project and habit detail routes: each resolves a readable
 * URL (`/projects/alpha-project`) to a row, then hands the id to a body that
 * fetches by id. Without the seeding that body would re-fetch the same row, so a
 * slug deep-link would cost two requests instead of one.
 *
 * The write is deliberately in the render pass rather than an effect. Child
 * effects run before the parent's, so an effect here fires only after the body
 * has already started its own request. Measured, not assumed. Nothing is
 * subscribed to the by-id key yet (the body has not mounted), so the write
 * notifies no one, and the app's 60s `staleTime` leaves the seeded entry fresh
 * enough that the by-id query does not revalidate it.
 */
export const useSlugResolution = <T extends { id: number }>(
    query: UseQueryResult<T>,
    byIdQueryKey: (row: T) => readonly unknown[]
): SlugResolution => {
    const queryClient = useQueryClient();
    const row = query.data ?? null;

    if (row) {
        queryClient.setQueryData(byIdQueryKey(row), row);
    }

    return {
        id: row?.id ?? null,
        isPending: query.isPending,
        notFound: !query.isPending && row === null
    };
};
