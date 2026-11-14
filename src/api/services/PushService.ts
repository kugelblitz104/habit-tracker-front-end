/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PushSubscriptionCreate } from '../models/PushSubscriptionCreate';
import type { PushSubscriptionDelete } from '../models/PushSubscriptionDelete';
import type { PushTest } from '../models/PushTest';
import type { VapidPublicKey } from '../models/VapidPublicKey';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PushService {
    /**
     * Get the server's VAPID public key
     * The key a browser passes as `applicationServerKey` when subscribing.
     *
     * Returns 404 when the server has no VAPID key and subject, which means
     * notifications are unavailable and clients should hide the feature.
     * @returns VapidPublicKey Successful Response
     * @throws ApiError
     */
    public static getVapidPublicKeyPushVapidPublicKeyGet(): CancelablePromise<VapidPublicKey> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/push/vapid-public-key',
            errors: {
                404: `Not found`,
            },
        });
    }
    /**
     * Register a browser for a profile's notifications
     * Save a browser's push subscription for a profile.
     *
     * Registering an endpoint the profile already has replaces its keys, so a
     * browser that rotated them can call this again. Returns 409 when the profile
     * already has the maximum number of other browsers registered.
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static subscribePushSubscriptionsPost(
        requestBody: PushSubscriptionCreate,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/push/subscriptions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Remove a browser from a profile's notifications
     * Delete one browser's subscription. Succeeds when it is already gone.
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static unsubscribePushSubscriptionsDelete(
        requestBody: PushSubscriptionDelete,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/push/subscriptions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Send a test notification to a profile's browsers
     * Send one notification to every browser registered for the profile.
     *
     * Returns 404 when the server has no VAPID key and subject, and 409 when the
     * profile has no registered browser. Returns 502 when the push service accepted
     * none of the sends. A browser the push service reports gone is unregistered
     * either way.
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static sendTestPushTestPost(
        requestBody: PushTest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/push/test',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
