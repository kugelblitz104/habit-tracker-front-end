/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProfileRead = {
    name: string;
    color_start?: string;
    color_end?: string;
    habits_enabled?: boolean;
    countdowns_enabled?: boolean;
    insights_enabled?: boolean;
    calendar_enabled?: boolean;
    publish_to_azure?: boolean;
    default_landing?: string;
    week_start_monday?: boolean;
    use_habit_color_accent?: boolean;
    show_estimated_effort?: boolean;
    pomodoro_work_minutes?: number;
    pomodoro_break_minutes?: number;
    pomodoro_long_break_minutes?: number;
    pomodoro_cycles?: number;
    id: number;
    created_date: string;
    updated_date?: (string | null);
};

