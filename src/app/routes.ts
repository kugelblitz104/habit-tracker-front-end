import { type RouteConfig, index, route } from '@react-router/dev/routes';

// NOTE: @react-router/dev does not hot-reload this file — the dev server keeps
// the route table it built at startup (Vite only triggers a client page
// reload). Restart the dev server after adding/removing routes here.
export default [
    // Public routes
    route('login', 'routes/public/login.tsx'),
    route('register', 'routes/public/register.tsx'),
    route('forgot-password', 'routes/public/forgot-password.tsx'),
    route('reset-password', 'routes/public/reset-password.tsx'),
    // Unlisted: absent from the nav and marked noindex, linked only from
    // Settings. Public because nothing on it is user-specific, so the URL can
    // be handed to anyone.
    route('release-notes', 'routes/public/release-notes.tsx'),

    // Protected routes
    index('routes/auth/today.tsx'),
    route('tasks', 'routes/auth/tasks.tsx'),
    route('countdown', 'routes/auth/countdown.tsx'),
    route('habits', 'routes/auth/habits.tsx'),
    route('projects', 'routes/auth/projects.tsx'),
    route('timer', 'routes/auth/timer.tsx'),
    route('insights', 'routes/auth/insights.tsx'),

    // Detail routes. Each `:*Ref` is a slug ("setup-utilities") or a numeric id
    // ("172"); the route resolves whichever it got. Numeric URLs stay
    // permanently valid: they are what every pre-slug bookmark contains.
    //
    // These sit AFTER their list routes above ('tasks', 'projects', 'habits') so
    // the static path wins over the parameterised one.
    route('tasks/:taskRef', 'routes/auth/task-detail.tsx'),
    route('projects/:projectRef', 'routes/auth/project.tsx'),
    route('habits/:habitRef', 'routes/auth/habit-detail.tsx'),
    // Habit detail used to live at /details/:habitId, kept as a redirect.
    route('details/:habitId', 'routes/auth/habit-detail-legacy-redirect.tsx'),
    route('settings', 'routes/auth/settings.tsx'),

    // Dev-only debug playground (LoadingPage/ErrorPage/Login/Register on
    // demand). Registered only in dev so the route and its module are absent
    // from prod builds.
    ...(import.meta.env.DEV ? [route('dev/debug', 'routes/dev/debug.tsx')] : [])
] satisfies RouteConfig;
