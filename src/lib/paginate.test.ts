import { describe, expect, it, vi } from 'vitest';

import { PAGE_SIZE, fetchAllPages, type PageRequest } from './paginate';

/**
 * A fake paginated endpoint over `rows`, slicing exactly like the API does.
 * Returns the requests it received so tests can assert the offsets walked.
 */
const fakeEndpoint = (rows: number[]) => {
    const requests: PageRequest[] = [];
    const fetchPage = async ({ offset, limit }: PageRequest) => {
        requests.push({ offset, limit });
        return { items: rows.slice(offset, offset + limit), total: rows.length };
    };
    return { fetchPage, requests };
};

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

describe('fetchAllPages', () => {
    it('makes a single request when the first page holds everything', async () => {
        const { fetchPage, requests } = fakeEndpoint(range(42));

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toHaveLength(42);
        expect(result.total).toBe(42);
        expect(requests).toEqual([{ offset: 0, limit: PAGE_SIZE }]);
    });

    it('walks past the 100-row cap and returns every row in order', async () => {
        // The reported bug: 115 tasks, page size 100, the last 15 never arrived.
        const { fetchPage, requests } = fakeEndpoint(range(115));

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toHaveLength(115);
        expect(result.items).toEqual(range(115));
        expect(requests).toEqual([
            { offset: 0, limit: PAGE_SIZE },
            { offset: 100, limit: PAGE_SIZE }
        ]);
    });

    it('keeps paging across several full pages', async () => {
        const { fetchPage, requests } = fakeEndpoint(range(250));

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toEqual(range(250));
        expect(requests.map((request) => request.offset)).toEqual([0, 100, 200]);
    });

    it('handles an exact multiple of the page size without an extra request', async () => {
        const { fetchPage, requests } = fakeEndpoint(range(200));

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toHaveLength(200);
        expect(requests.map((request) => request.offset)).toEqual([0, 100]);
    });

    it('returns an empty result for an empty list', async () => {
        const { fetchPage, requests } = fakeEndpoint([]);

        const result = await fetchAllPages(fetchPage);

        expect(result).toEqual({ items: [], total: 0 });
        expect(requests).toHaveLength(1);
    });

    it('offsets by rows collected, so a short page leaves no hole', async () => {
        // Page 1 comes back short (a row was deleted between requests); the walk
        // must resume at 90, not at 100.
        const offsets: number[] = [];
        const fetchPage = async ({ offset }: PageRequest) => {
            offsets.push(offset);
            return offset === 0
                ? { items: range(90), total: 120 }
                : { items: range(30), total: 120 };
        };

        const result = await fetchAllPages(fetchPage);

        expect(offsets).toEqual([0, 90]);
        expect(result.items).toHaveLength(120);
    });

    it('stops when a page comes back empty despite a larger total', async () => {
        const fetchPage = vi
            .fn<(request: PageRequest) => Promise<{ items: number[]; total: number }>>()
            .mockResolvedValueOnce({ items: range(100), total: 500 })
            .mockResolvedValue({ items: [], total: 500 });

        const result = await fetchAllPages(fetchPage);

        // Two calls only: the empty second page ends the walk instead of
        // re-requesting the same offset until MAX_PAGES.
        expect(fetchPage).toHaveBeenCalledTimes(2);
        expect(result.items).toHaveLength(100);
    });

    it('bounds the walk and warns when total never converges', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // Always claims one more page than delivered — an unconverging total.
        const fetchPage = async ({ offset, limit }: PageRequest) => ({
            items: range(limit),
            total: offset + limit * 2
        });

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toHaveLength(50 * PAGE_SIZE);
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });

    it('reports total as the rows held when total lags behind', async () => {
        const fetchPage = async ({ offset }: PageRequest) =>
            offset === 0 ? { items: range(100), total: 120 } : { items: range(25), total: 110 };

        const result = await fetchAllPages(fetchPage);

        expect(result.items).toHaveLength(125);
        expect(result.total).toBe(125);
    });

    describe('maxRows', () => {
        it('stops at the cap and reports the untruncated total', async () => {
            const { fetchPage, requests } = fakeEndpoint(range(900));

            const result = await fetchAllPages(fetchPage, { maxRows: 500 });

            expect(result.items).toHaveLength(500);
            // The server's total survives, so callers can detect the cap.
            expect(result.total).toBe(900);
            expect(requests.map((request) => request.offset)).toEqual([0, 100, 200, 300, 400]);
        });

        it('does not pad requests when the list is smaller than the cap', async () => {
            const { fetchPage, requests } = fakeEndpoint(range(115));

            const result = await fetchAllPages(fetchPage, { maxRows: 500 });

            expect(result.items).toHaveLength(115);
            expect(result.total).toBe(115);
            expect(requests).toHaveLength(2);
        });
    });
});
