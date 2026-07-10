import { AppHeader } from '@/components/layouts/app-header';
import { RecentEntries } from '@/features/time-entries/components/recent-entries';
import { TimerPanel } from '@/features/time-entries/components/timer-panel';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';

export const TimerPage = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <div className='mx-auto max-w-[640px]'>
                    <TimerPanel profile={activeProfile} profileId={profileId} />

                    <RecentEntries profileId={profileId} />
                </div>
            </div>
        </div>
    );
};
