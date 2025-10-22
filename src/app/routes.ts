import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
    index('routes/auth/home.tsx'),
    route('details/:habitId', 'routes/auth/habit-detail.tsx')
] satisfies RouteConfig;
