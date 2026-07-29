import { TasksService } from '@/api';
import { toLocalDateString } from '@/lib/date-utils';
import { downloadText, slugify } from '@/lib/download';

/**
 * Export a profile's tasks as a Markdown checklist and trigger a browser
 * download. The backend returns the raw `text/markdown` document (axios keeps
 * the non-JSON body as a plain string), so we save it directly as a `.md`
 * file named `tasks-{profile-name-slug}-{YYYY-MM-DD}.md`.
 * @returns The downloaded filename.
 */
export const exportTasksMarkdown = async (
    profileId: number,
    profileName: string
): Promise<string> => {
    const markdown = await TasksService.exportTasksMarkdownTasksExportGet(profileId);
    const filename = `tasks-${slugify(profileName, 'profile')}-${toLocalDateString(new Date())}.md`;

    downloadText(markdown, filename, 'text/markdown');

    return filename;
};
