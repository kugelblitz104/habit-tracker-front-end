import { PushService, type ProfileRead, type ProfileUpdate } from '@/api';
import { Button } from '@/components/ui/buttons/button';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import { themedInputClass, themedInputStyle } from '@/components/ui/forms/input-styles';
import { useVapidPublicKey } from '@/features/notifications/api/get-vapid-key';
import { OffsetChips } from '@/features/notifications/components/offset-chips';
import {
    isProfileRegistered,
    markProfileRegistered,
    sameServerKey,
    unmarkProfileRegistered
} from '@/features/notifications/utils/device-registration';
import { base64UrlToBytes } from '@/features/notifications/utils/device-registration';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { apiErrorMessage } from '@/lib/api-error-message';
import { Send } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

const rowBorderStyle = { borderColor: 'rgba(255,255,255,.06)' } as const;

type NotificationsCardProps = {
    profile: ProfileRead;
};

const isIos = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

const pushSupported = () =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

type TriggerKey =
    | 'notify_task_due'
    | 'notify_task_scheduled'
    | 'notify_habits'
    | 'notify_countdowns'
    | 'notify_journal';

const TRIGGERS: ReadonlyArray<{ key: TriggerKey; title: string; hint: string }> = [
    { key: 'notify_task_due', title: 'Task due dates', hint: 'Before a task is due' },
    {
        key: 'notify_task_scheduled',
        title: 'Task scheduled dates',
        hint: 'Before a scheduled task starts'
    },
    { key: 'notify_habits', title: 'Habits', hint: 'At each habit reminder time' },
    { key: 'notify_countdowns', title: 'Countdowns', hint: 'When a countdown arrives' },
    { key: 'notify_journal', title: 'Journal', hint: 'At the journal reminder time' }
];

const Row = ({
    title,
    hint,
    control,
    children
}: {
    title: string;
    hint?: string;
    control?: ReactNode;
    children?: ReactNode;
}) => (
    <div className='border-t py-3.5 first:border-t-0 first:pt-0' style={rowBorderStyle}>
        <div className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
                <div className='text-lead font-medium' style={{ color: '#f0e7db' }}>
                    {title}
                </div>
                {hint && <div className='mt-0.5 text-meta text-text-muted'>{hint}</div>}
            </div>
            {control}
        </div>
        {children && <div className='mt-2.5'>{children}</div>}
    </div>
);

/**
 * NOTIFICATIONS card: this browser's push subscription, the per-profile trigger
 * toggles and reminder offsets, and a test button. Rendered only when the
 * server exposes a VAPID key.
 */
export const NotificationsCard = ({ profile }: NotificationsCardProps) => {
    const vapid = useVapidPublicKey();
    const updateProfile = useUpdateProfile({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update profile'));
            }
        }
    });
    const patch = (data: ProfileUpdate) => updateProfile.mutate({ profileId: profile.id, data });

    const supported = pushSupported();
    const [subscribed, setSubscribed] = useState(false);
    const [deviceBusy, setDeviceBusy] = useState(false);
    const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        if (!supported) return;
        let cancelled = false;
        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => {
                if (!cancelled) setSubscribed(sub != null && isProfileRegistered(profile.id));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [supported, profile.id]);

    if (!vapid.data) return null;
    const publicKey = vapid.data.public_key;

    const enableDevice = async () => {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            setDeviceMessage(
                permission === 'denied'
                    ? 'Notifications are blocked for this site. Allow them in the browser’s site settings, then try again.'
                    : 'Permission was dismissed. Turn the switch on again to be asked once more.'
            );
            return;
        }
        const reg = await navigator.serviceWorker.ready;
        const key = base64UrlToBytes(publicKey);
        let existing = await reg.pushManager.getSubscription();
        if (existing && !sameServerKey(existing.options.applicationServerKey, key)) {
            await existing.unsubscribe();
            existing = null;
        }
        const sub =
            existing ??
            (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: key
            }));
        const { endpoint, keys } = sub.toJSON();
        try {
            if (!endpoint || !keys?.p256dh || !keys.auth)
                throw new Error('Incomplete subscription');
            await PushService.subscribePushSubscriptionsPost({
                profile_id: profile.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            });
        } catch (error) {
            // Drop a subscription this call created so the switch and the server agree.
            if (!existing) await sub.unsubscribe().catch(() => {});
            throw error;
        }
        markProfileRegistered(profile.id);
        setSubscribed(true);
    };

    const disableDevice = async () => {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await PushService.unsubscribePushSubscriptionsDelete({
                profile_id: profile.id,
                endpoint: sub.endpoint
            });
            if (unmarkProfileRegistered(profile.id) === 0) await sub.unsubscribe();
        } else {
            unmarkProfileRegistered(profile.id);
        }
        setSubscribed(false);
    };

    const toggleDevice = async (on: boolean) => {
        setDeviceBusy(true);
        setDeviceMessage(null);
        try {
            await (on ? enableDevice() : disableDevice());
        } catch (error) {
            setDeviceMessage(
                apiErrorMessage(error, `Could not turn notifications ${on ? 'on' : 'off'}`)
            );
        } finally {
            setDeviceBusy(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            await PushService.sendTestPushTestPost({ profile_id: profile.id });
            toast.success('Test notification sent');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to send the test notification'));
        } finally {
            setTesting(false);
        }
    };

    const needsHomeScreen = !supported && isIos() && !isStandalone();
    const blocked = supported && Notification.permission === 'denied' && !subscribed;

    return (
        <SettingsCard label='Notifications' labelGapClass='mb-1.5'>
            <Row
                title='Notifications on this device'
                hint={
                    supported
                        ? `Push reminders to this browser for ${profile.name}`
                        : needsHomeScreen
                          ? 'Add this app to your Home Screen to get notifications'
                          : 'This browser does not support push notifications.'
                }
                control={
                    <EmberToggle
                        checked={subscribed}
                        onChange={toggleDevice}
                        label='Notifications on this device'
                        disabled={!supported || deviceBusy || (blocked && !subscribed)}
                    />
                }
            >
                {(deviceMessage ?? (blocked ? 'blocked' : null)) && (
                    <p role='alert' className='text-meta text-text-muted'>
                        {deviceMessage ??
                            'Notifications are blocked for this site. Allow them in the browser’s site settings to turn this on.'}
                    </p>
                )}
            </Row>

            {TRIGGERS.map(({ key, title, hint }) => (
                <Row
                    key={key}
                    title={title}
                    hint={hint}
                    control={
                        <EmberToggle
                            checked={profile[key] ?? false}
                            onChange={(value) => patch({ [key]: value })}
                            label={`${title} notifications for ${profile.name}`}
                            disabled={updateProfile.isPending}
                        />
                    }
                >
                    {key === 'notify_task_due' && (
                        <OffsetChips
                            label='Due reminders'
                            value={profile.task_due_reminder_offsets ?? []}
                            onChange={(next) => patch({ task_due_reminder_offsets: next })}
                            disabled={updateProfile.isPending}
                        />
                    )}
                    {key === 'notify_task_scheduled' && (
                        <OffsetChips
                            label='Scheduled reminders'
                            value={profile.task_scheduled_reminder_offsets ?? []}
                            onChange={(next) => patch({ task_scheduled_reminder_offsets: next })}
                            disabled={updateProfile.isPending}
                        />
                    )}
                </Row>
            ))}

            <Row
                title='Default time for date-only tasks'
                hint='Reminders for a task with a date but no time count from this time'
                control={
                    <input
                        type='time'
                        value={(profile.task_reminder_default_time ?? '').slice(0, 5)}
                        onChange={(e) =>
                            e.target.value && patch({ task_reminder_default_time: e.target.value })
                        }
                        aria-label='Default reminder time for date-only tasks'
                        disabled={updateProfile.isPending}
                        className={themedInputClass}
                        style={{ ...themedInputStyle, width: 120 }}
                    />
                }
            />

            <Row
                title='Send test notification'
                hint='Delivers one notification to every device registered for this profile'
                control={
                    <Button
                        onClick={sendTest}
                        disabled={!subscribed || testing}
                        className='shrink-0'
                    >
                        <Send size={14} />
                        {testing ? 'Sending…' : 'Send test'}
                    </Button>
                }
            />
        </SettingsCard>
    );
};
