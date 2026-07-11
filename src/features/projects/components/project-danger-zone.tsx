import type { ProjectRead } from '@/api';
import { Archive, ArchiveRestore, Trash } from 'lucide-react';

type ProjectDangerZoneProps = {
    project: ProjectRead;
    isArchiving: boolean;
    onToggleArchive: () => void;
    onDeleteClick: () => void;
};

/**
 * Footer danger zone for the project route: Archive/Unarchive + Delete,
 * separated from the content by a hairline (mirrors the habit detail footer).
 */
export const ProjectDangerZone = ({
    project,
    isArchiving,
    onToggleArchive,
    onDeleteClick
}: ProjectDangerZoneProps) => (
    <div
        className='mt-[30px] flex items-center justify-end gap-1.5 border-t pt-4'
        style={{ borderColor: 'var(--surface-card-border)' }}
    >
        <button
            type='button'
            onClick={onToggleArchive}
            disabled={isArchiving}
            className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
            style={{ borderColor: 'var(--habit-container-border)' }}
        >
            {project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            {project.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button
            type='button'
            onClick={onDeleteClick}
            className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125'
            style={{ borderColor: 'var(--habit-container-border)', color: 'var(--color-danger)' }}
        >
            <Trash size={13} />
            Delete
        </button>
    </div>
);
