import { ApiError } from '@/api';

/**
 * Extract a short human-readable message from a failed API call. FastAPI puts
 * its message in `body.detail` (e.g. "Cannot delete the last profile") — or,
 * for 422 validation errors, a LIST of `{msg, ...}` entries; fall back to the
 * generic Error message, then to the caller's fallback.
 */
export const apiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
    if (error instanceof ApiError) {
        const detail = (error.body as { detail?: unknown } | null)?.detail;
        if (typeof detail === 'string' && detail.length > 0) {
            return detail;
        }
        if (Array.isArray(detail) && detail.length > 0) {
            const message = detail
                .map((entry) => {
                    const msg = (entry as { msg?: unknown } | null)?.msg;
                    return typeof msg === 'string' && msg.length > 0
                        ? msg
                        : JSON.stringify(entry);
                })
                .join('; ');
            if (message.length > 0) {
                return message;
            }
        }
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};
