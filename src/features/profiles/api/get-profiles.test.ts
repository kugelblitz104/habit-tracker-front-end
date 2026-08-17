import { ProfilesService, type ProfileRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProfiles } from './get-profiles';

const profile = (id: number) => ({ id, name: `Profile ${id}` }) as ProfileRead;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getProfiles', () => {
    it('walks every page', async () => {
        const total = 150;
        const spy = vi.spyOn(ProfilesService, 'listProfilesProfilesGet').mockImplementation((async (
            _userId: number | null,
            limit: number,
            offset: number
        ) => ({
            profiles: Array.from({ length: Math.min(limit, total - offset) }, (_, i) =>
                profile(offset + i)
            ),
            total,
            limit,
            offset
        })) as never);

        const result = await getProfiles();

        expect(result.profiles).toHaveLength(total);
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
