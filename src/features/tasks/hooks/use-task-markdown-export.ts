import type { ProjectRead, TaskRead } from '@/api';
import {
    buildTaskSections,
    passesDateFilter,
    showClosedSection,
    type TaskControlsState
} from '@/features/tasks/utils/task-controls';
import { downloadMarkdownFile, renderTasksMarkdown } from '@/features/tasks/utils/task-markdown';
import { toLocalDateString } from '@/lib/date-utils';
import { slugify } from '@/lib/download';
import { useCallback, useMemo } from 'react';

type UseTaskMarkdownExportOptions = {
    /** Top-level tasks passing the current filters (excludes closed). */
    tasks: TaskRead[];
    /** Every loaded task (incl. closed) — feeds the Closed section + counts. */
    allLoadedTasks: TaskRead[];
    controls: TaskControlsState;
    projectsById: Map<number, ProjectRead>;
    /** Markdown H1 — differs per caller ('All tasks' vs the project's name). */
    title: string;
    /** Name to slugify for the filename (the profile's or the project's name). */
    filenameSource: string | undefined;
    /** Fallback slug used when `filenameSource` slugifies to nothing. */
    filenameFallback: string;
};

/**
 * Shared "export the current filtered/grouped view as Markdown" handler for
 * All tasks and the project view, plus the `visibleIds` the bulk "Select all"
 * action targets. Title and filename are per-caller — `e2e/flows/task-export.spec.ts`
 * asserts the two surfaces produce distinctly-named documents.
 */
export const useTaskMarkdownExport = ({
    tasks,
    allLoadedTasks,
    controls,
    projectsById,
    title,
    filenameSource,
    filenameFallback
}: UseTaskMarkdownExportOptions) => {
    const showClosed = showClosedSection(controls);

    const handleExport = useCallback(() => {
        const sections = buildTaskSections(tasks, controls, projectsById);
        const closedTasks = showClosed
            ? allLoadedTasks.filter(
                  (t) => t.parent_id == null && t.band === 'hidden' && passesDateFilter(t, controls)
              )
            : [];
        const markdown = renderTasksMarkdown({
            title,
            sections,
            closedTasks,
            allTasks: allLoadedTasks,
            projectsById
        });
        const slug = slugify(filenameSource ?? '', filenameFallback);
        downloadMarkdownFile(`tasks-${slug}-${toLocalDateString(new Date())}.md`, markdown);
    }, [
        tasks,
        controls,
        projectsById,
        showClosed,
        allLoadedTasks,
        title,
        filenameSource,
        filenameFallback
    ]);

    // Ids currently visible under the active filters — the target of "Select all".
    const visibleIds = useMemo(
        () =>
            buildTaskSections(tasks, controls, projectsById).flatMap((s) =>
                s.tasks.map((t) => t.id)
            ),
        [tasks, controls, projectsById]
    );

    return { handleExport, visibleIds };
};
