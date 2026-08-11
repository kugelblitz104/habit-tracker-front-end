import type { Config } from '@react-router/dev/config';

export default {
    appDirectory: './src/app/',
    // SPA mode: no runtime Node server. Every protected route is behind an
    // auth gate that reads localStorage, so SSR could only ever render a
    // spinner for them, since the server has no way to know who the user is.
    ssr: false,
    // The public routes are the ones SSR was actually rendering content for,
    // so they are prerendered to static HTML at build time instead. Anything
    // on these pages that must be fresh has to be fetched client-side; they
    // are frozen as of the build.
    prerender: ['/login', '/register', '/forgot-password', '/reset-password', '/release-notes']
} satisfies Config;
