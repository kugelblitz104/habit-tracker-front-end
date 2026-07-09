/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single unbroken run of days that count toward a habit's streak.
 *
 * A day counts when it has an explicit completion or skip, or when it is
 * auto-skipped (the frequency goal was already met within the range window).
 */
export type HabitStreak = {
    start_date: string;
    end_date: string;
    length: number;
};

