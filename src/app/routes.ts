import { type RouteConfig, index, route } from '@react-router/dev/routes';

// NOTE: @react-router/dev does not hot-reload this file — the dev server keeps
// the route table it built at startup (Vite only triggers a client page
// reload). Restart the dev server after adding/removing routes here.
export default [
    // Public routes
    route('login', 'routes/public/login.tsx'),
    route('register', 'routes/public/register.tsx'),

    // Protected routes
    index('routes/auth/today.tsx'),
    route('tasks', 'routes/auth/tasks.tsx'),
    route('habits', 'routes/auth/habits.tsx'),
    route('projects', 'routes/auth/projects.tsx'),
    route('projects/:projectId', 'routes/auth/project.tsx'),
    route('timer', 'routes/auth/timer.tsx'),
    route('details/:habitId', 'routes/auth/habit-detail.tsx'),
    route('tasks/:taskId', 'routes/auth/task-detail.tsx'),
    route('settings', 'routes/auth/settings.tsx'),

    // Dev-only debug playground (LoadingPage/ErrorPage/Login/Register on
    // demand). Registered only in dev so the route and its module are absent
    // from prod builds.
    ...(import.meta.env.DEV ? [route('dev/debug', 'routes/dev/debug.tsx')] : [])
] satisfies RouteConfig;
