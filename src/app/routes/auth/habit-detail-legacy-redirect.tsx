import { Navigate, useLocation } from 'react-router';
import type { Route } from './+types/habit-detail-legacy-redirect';

/**
 * Permanent home for the old habit detail path.
 *
 * Habit detail moved from `/details/:habitId` to `/habits/:habitRef` when habits
 * gained readable slugs, so the two live under one prefix with tasks and
 * projects. Every bookmark and every `state.from`-carrying link created before
 * that still points here, so this forwards rather than 404s.
 *
 * `replace` keeps the dead URL out of the history stack, so Back from the habit
 * does not land here and immediately forward again. Location state is passed
 * through so the destination's back-nav still knows where it came from.
 *
 * The segment is forwarded verbatim rather than parsed: `/habits/:habitRef`
 * accepts an id or a slug, so anything valid here is valid there, and anything
 * invalid produces the same error either way.
 */
export default function HabitDetailLegacyRedirect({
    params
}: Route.ComponentProps & { params: { habitId: string } }) {
    // `state` has to be forwarded explicitly: Navigate drops it otherwise, and
    // the destination reads `state.from` to choose its back link.
    const { state } = useLocation();
    return <Navigate to={`/habits/${params.habitId}`} state={state} replace />;
}
