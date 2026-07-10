import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration
} from 'react-router';

// import type { Route } from './+types/root';

import './app.css';
import 'react-toastify/dist/ReactToastify.css';

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
                    style={{ backgroundColor: 'var(--bg)' }}
                >
                    <Outlet />
                </div>
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
