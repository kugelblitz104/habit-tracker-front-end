import { ErrorPage } from '@/components/layouts/error-page';
import { Banner } from '@/components/ui/banner';
import { LoadingPage } from '@/components/layouts/loading-page';
import { LoginPage } from '@/components/layouts/login-page';
import { RegistrationPage } from '@/components/layouts/registration-page';
import { AuthContext, type AuthContextType } from '@/lib/auth-context';
import { Scale } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

/**
 * DEV-ONLY playground route. Registered in routes.ts only when
 * `import.meta.env.DEV`, so it does not exist in production builds. Renders
 * full-page states that are otherwise hard to reach on demand:
 *   /dev/debug?view=loading  -> <LoadingPage />
 *   /dev/debug?view=error    -> <ErrorPage />
 *   /dev/debug?view=login    -> <LoginPage /> (styling preview, see below)
 *   /dev/debug?view=register -> <RegistrationPage /> (styling preview)
 *   /dev/debug?view=banner   -> every shape of <Banner />
 * With no `view` param it shows a tiny index of those links.
 *
 * Login/Register are rendered under a stubbed signed-out AuthContext: the real
 * pages redirect authenticated users to `/` (correct app behavior on the real
 * /login and /register routes), which would make them uninspectable for a
 * signed-in dev. The stub only affects what's rendered inside this playground;
 * the real routes and their guards are untouched. Submitting the forms here
 * still hits the real API but won't update the app's actual auth state.
 */

const SIGNED_OUT_AUTH: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    authorize: async () => {},
    logout: () => {},
    activeProfile: null,
    activeProfileId: null,
    profiles: [],
    setActiveProfileId: () => {},
    profilesLoading: false
};

const VIEWS = ['loading', 'error', 'login', 'register', 'banner'] as const;

/**
 * Every shape of `Banner`, since which parts are optional is the whole of its
 * API: with and without a detail line, an icon, an action and a dismiss.
 */
const BannerGallery = () => (
    <div className='mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-7'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted'>Banner</p>
        <Banner
            icon={<Scale className='h-4 w-4' />}
            title='Everything at once'
            detail='Icon, detail line, action and dismiss'
            action={{ label: 'Act', to: '/dev/debug?view=banner' }}
            onDismiss={() => toast.info('Dismissed (debug)')}
            dismissLabel='Dismiss the everything banner'
        />
        <Banner title='Title only' />
        <Banner
            title='No dismiss, so it cannot be waved away'
            detail='An action you must take'
            action={{ label: 'Act', onClick: () => toast.success('Clicked (debug)') }}
        />
        <Banner
            title='A title long enough to wrap at narrow widths, which is where the action and the dismiss control have to stay reachable rather than overflowing the row'
            detail='Check this one at 390px'
            action={{ label: 'Act', onClick: () => {} }}
            onDismiss={() => {}}
            dismissLabel='Dismiss the long banner'
        />
        <Link className='font-display text-[13px] text-text-muted underline' to='/dev/debug'>
            Back to the playground
        </Link>
    </div>
);

export default function DebugPlayground() {
    const [searchParams] = useSearchParams();
    const view = searchParams.get('view');

    if (view === 'loading') return <LoadingPage />;
    if (view === 'error') return <ErrorPage message='Forced by /dev/debug?view=error' />;
    if (view === 'banner') return <BannerGallery />;
    if (view === 'login' || view === 'register') {
        return (
            <AuthContext value={SIGNED_OUT_AUTH}>
                {view === 'login' ? <LoginPage /> : <RegistrationPage />}
            </AuthContext>
        );
    }

    return (
        <div
            className='flex min-h-screen flex-col items-center justify-center gap-3'
            style={{ backgroundColor: 'transparent' }}
        >
            <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted'>
                Dev debug playground
            </p>
            <div className='flex gap-4 font-display text-[13px]'>
                {VIEWS.map((v) => (
                    <Link
                        key={v}
                        className='text-text-secondary underline'
                        to={`/dev/debug?view=${v}`}
                    >
                        {v}
                    </Link>
                ))}
                <Link className='text-text-muted underline' to='/'>
                    Back to app
                </Link>
            </div>
        </div>
    );
}
