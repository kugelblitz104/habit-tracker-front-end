import { PushService } from '@/api';
import { useQuery } from '@tanstack/react-query';

/**
 * The instance's VAPID public key. A 404 means the server has no VAPID keys, so
 * the query errors and callers hide the notification settings; it is not retried.
 */
export const useVapidPublicKey = () =>
    useQuery({
        queryKey: ['push', 'vapid-public-key'],
        queryFn: () => PushService.getVapidPublicKeyPushVapidPublicKeyGet(),
        retry: false,
        staleTime: Infinity
    });
