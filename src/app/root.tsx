import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration
} from 'react-router';

// import type { Route } from './+types/root';

// Toastify's stylesheet MUST be imported BEFORE app.css: with cssCodeSplit
// off the bundle concatenates CSS in import order, and app.css's --toastify-*
// vars / .Toastify__* rules only beat the stock ones by coming later. (v11's
// runtime self-injection can't be relied on under React Router SSR — without
// this import toasts render unstyled at the bottom of the page.)
import 'react-toastify/dist/ReactToastify.css';
import './app.css';

// Self-hosted fonts (Space Grotesk display + JetBrains Mono meta) via @fontsource.
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

// Hashed URLs for the primary latin woff2 files, preloaded below so the fonts
// are fetched with the document instead of lazily on first glyph paint — the
// lazy fetch is what flashed fallback fonts when a weight was first used.
import spaceGrotesk400Url from '@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2?url';
import spaceGrotesk500Url from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2?url';
import spaceGrotesk600Url from '@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2?url';
import spaceGrotesk700Url from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2?url';
import jetbrainsMono400Url from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import jetbrainsMono500Url from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ToastContainer } from 'react-toastify';

// Configure OpenAPI client base URL
import '@/lib/api-client';
import { queryConfig } from '@/lib/react-query';
import { AuthProvider } from '@/lib/auth-context';
import type { Route } from './+types/root';

// Preload every weight used at first paint (crossOrigin is required for font
// preloads even same-origin, or browsers discard the preloaded response).
export const links: Route.LinksFunction = () =>
    [
        spaceGrotesk400Url,
        spaceGrotesk500Url,
        spaceGrotesk600Url,
        spaceGrotesk700Url,
        jetbrainsMono400Url,
        jetbrainsMono500Url
    ].map((href) => ({
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href,
        crossOrigin: 'anonymous' as const
    }));

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <head>
                <meta charSet='utf-8' />
                <meta name='viewport' content='width=device-width, initial-scale=1' />
                {/* PWA: installable app metadata + icons. */}
                <link rel='manifest' href='/manifest.webmanifest' />
                <meta name='theme-color' content='#17130c' />
                <meta name='mobile-web-app-capable' content='yes' />
                <meta name='apple-mobile-web-app-capable' content='yes' />
                <meta name='apple-mobile-web-app-status-bar-style' content='black-translucent' />
                <meta name='apple-mobile-web-app-title' content='Ergosphere' />
                <link rel='icon' href='/icon-192.png' type='image/png' />
                <link rel='apple-touch-icon' href='/icon-192.png' />
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    const [queryClient] = React.useState(
        () =>
            new QueryClient({
                defaultOptions: queryConfig
            })
    );

    // Register the service worker (client-only) so the app is installable and
    // works offline. Prod-safe: failures are swallowed.
    React.useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }, []);
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {/* App-root wrapper carries the dynamic theme (was on <html>) and
                    the base themed background so the surface fills the viewport.
                    Defaults are literal for now; Phase 4 (Settings) makes them
                    dynamic from user prefs. */}
                <div
                    data-tone='ember'
                    data-heat='warm'
                    data-focus='false'
                    className='min-h-screen'
                    style={{ backgroundColor: 'transparent' }}
                >
                    <Outlet />
                    {/* Inside the tone wrapper so toasts inherit any theme vars
                        that become tone-scoped later (ToastContainer renders
                        inline here, not in a portal). */}
                    <ToastContainer
                        position='top-right'
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme='dark'
                    />
                </div>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = 'Oops!';
    let details = 'An unexpected error occurred.';
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? '404' : 'Error';
        details =
            error.status === 404
                ? 'The requested page could not be found.'
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className='pt-16 p-4 container mx-auto'>
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className='w-full p-4 overflow-x-auto'>
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}
