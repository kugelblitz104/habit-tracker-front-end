import { TasksService } from '@/api';
import { toLocalDateString } from '@/lib/date-utils';

/** Lowercase and collapse non-alphanumeric runs to single dashes ("My Profile!" -> "my-profile"). */
const slugify = (value: string): string => {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'profile';
};

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
    const filename = `tasks-${slugify(profileName)}-${toLocalDateString(new Date())}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);

    return filename;
};
