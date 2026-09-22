/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HabitKPIsEntry } from './HabitKPIsEntry';
/**
 * Computed KPIs for a page of a profile's habits.
 *
 * Paging is over habits; `total` is the habit match count.
 */
export type HabitKPIsList = {
    items?: Array<HabitKPIsEntry>;
    total: number;
    limit: number;
    offset: number;
};

