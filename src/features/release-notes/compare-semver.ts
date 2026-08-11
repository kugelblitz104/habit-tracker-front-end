/**
 * Compare two `major.minor.patch` strings numerically. Negative when `a` is the
 * older version, positive when it is the newer, zero when they match.
 *
 * Sorting release versions as plain strings puts 1.10.0 before 1.9.0, which is
 * why this exists.
 */
export const compareSemver = (a: string, b: string): number => {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};
