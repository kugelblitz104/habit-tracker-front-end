/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectTimeSummary } from './ProjectTimeSummary';
import type { TaskTimeSummary } from './TaskTimeSummary';
export type TimeEntrySummary = {
    profile_id: number;
    per_task?: Array<TaskTimeSummary>;
    per_project?: Array<ProjectTimeSummary>;
    total_seconds: number;
};

