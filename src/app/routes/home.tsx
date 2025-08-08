// import type { Route } from './+types/home';
import type { Route } from './+types/home';
import { HabitsDashboard } from '@/components/layouts/dashboard'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Habit Tracker' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  return (
    <>
      <HabitsDashboard userId={1}/>
    </>
  );
}
