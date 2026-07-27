/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalendarConnectionBackup } from './CalendarConnectionBackup';
import type { CountdownBackup } from './CountdownBackup';
import type { HabitBackup } from './HabitBackup';
import type { IntegrationConnectionBackup } from './IntegrationConnectionBackup';
import type { ProfileSettings } from './ProfileSettings';
import type { ProjectBackup } from './ProjectBackup';
import type { TaskBackup } from './TaskBackup';
import type { TimeEntryBackup } from './TimeEntryBackup';
import type { TrackerBackup } from './TrackerBackup';
/**
 * A complete, portable snapshot of one profile and its data.
 */
export type ProfileBackup = {
    format?: string;
    version?: number;
    exported_at: string;
    profile: ProfileSettings;
    projects?: Array<ProjectBackup>;
    tasks?: Array<TaskBackup>;
    countdowns?: Array<CountdownBackup>;
    time_entries?: Array<TimeEntryBackup>;
    habits?: Array<HabitBackup>;
    trackers?: Array<TrackerBackup>;
    calendar_connections?: Array<CalendarConnectionBackup>;
    integration_connections?: Array<IntegrationConnectionBackup>;
};

