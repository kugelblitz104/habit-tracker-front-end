import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
    index('routes/home.tsx'),
    route('details/:habitId', 'routes/habit-detail.tsx')
] satisfies RouteConfig;