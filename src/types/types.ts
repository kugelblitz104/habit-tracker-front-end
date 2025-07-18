//TODO: auto-generate?

export type User = {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    habits: Habit[]
}

export type Habit = {
  id: number;
  user_id: number;
  name: string;
  question: string;
  color: string;
  frequency: string;
  reminder: boolean;
  notes: string;
  trackers: Tracker[];
}

export type Tracker = {
    id: number;
    habit_id: number;
    dated: string;
    timed: string;
    completed: boolean;
    skipped: boolean;
    note: string;
}

export type Meta = {
  page: number;
  total: number;
  total_pages: number;
}

export enum Status {
    NOT_COMPLETED = "not_completed",
    COMPLETED = "completed",
    SKIPPED = "skipped",
}