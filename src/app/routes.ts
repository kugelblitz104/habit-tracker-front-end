import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
    // Public routes
    route('login', 'routes/public/login.tsx'),
    route('register', 'routes/public/register.tsx'),

    // Protected routes
    index('routes/auth/home.tsx'),
    route('details/:habitId', 'routes/auth/habit-detail.tsx')
] satisfies RouteConfig;
