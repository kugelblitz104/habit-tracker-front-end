import { ErrorPage } from '@/components/layouts/error-page';
import { LoadingPage } from '@/components/layouts/loading-page';
import { LoginPage } from '@/components/layouts/login-page';
import { RegistrationPage } from '@/components/layouts/registration-page';
import { AuthContext, type AuthContextType } from '@/lib/auth-context';
import { Link, useSearchParams } from 'react-router';

/**
 * DEV-ONLY playground route. Registered in routes.ts only when
 * `import.meta.env.DEV`, so it does not exist in production builds. Renders
 * full-page states that are otherwise hard to reach on demand:
 *   /dev/debug?view=loading  -> <LoadingPage />
 *   /dev/debug?view=error    -> <ErrorPage />
 *   /dev/debug?view=login    -> <LoginPage /> (styling preview, see below)
 *   /dev/debug?view=register -> <RegistrationPage /> (styling preview)
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

const VIEWS = ['loading', 'error', 'login', 'register'] as const;

export default function DebugPlayground() {
    const [searchParams] = useSearchParams();
    const view = searchParams.get('view');

    if (view === 'loading') return <LoadingPage />;
    if (view === 'error') return <ErrorPage message='Forced by /dev/debug?view=error' />;
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
