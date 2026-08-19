import type { ProjectRead } from '@/api';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/buttons/button';
import { Pencil } from 'lucide-react';

type ProjectHeaderProps = {
    backTo: string;
    backLabel: string;
    project: ProjectRead | undefined;
    openCount: number;
    doneCount: number;
    donePct: number;
    onEdit: () => void;
};

/**
 * Read-view header for the project route: back link, color swatch + title +
 * archived chip + edit button, and the open/done progress bar. Swapped out
 * for ProjectEditor while editing (see project.tsx).
 */
export const ProjectHeader = ({
    backTo,
    backLabel,
    project,
    openCount,
    doneCount,
    donePct,
    onEdit
}: ProjectHeaderProps) => (
    <header className='mb-[30px]'>
        <BackLink
            to={backTo}
            label={backLabel}
            className='font-mono text-[12px] text-text-muted hover:text-text-secondary'
        />

        <div className='mt-3 flex items-start justify-between gap-4'>
            <div className='flex min-w-0 items-center gap-2.5'>
                {project && (
                    <span
                        className='inline-block h-3.5 w-3.5 shrink-0 rounded-sm'
                        style={{ backgroundColor: project.color }}
                    />
                )}
                <h1 className='truncate font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                    {project?.name ?? 'Project'}
                </h1>
                {project?.archived && (
                    <span
                        className='shrink-0 rounded-chip border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted'
                        style={{ borderColor: 'var(--surface-card-border)' }}
                    >
                        Archived
                    </span>
                )}
            </div>
            {project && (
                <Button
                    variant='icon'
                    size='sm'
                    onClick={onEdit}
                    aria-label='Edit project'
                    title='Edit project'
                    className='shrink-0'
                    style={{ borderColor: 'var(--habit-container-border)' }}
                >
                    <Pencil size={14} />
                </Button>
            )}
        </div>

        <p className='mt-1.5 font-mono text-[12px] text-text-muted'>
            {openCount} open · {doneCount} done
        </p>
        <div
            className='mt-2 h-1.5 w-full max-w-[280px] overflow-hidden rounded-chip'
            style={{ backgroundColor: 'var(--surface-input-bg)' }}
        >
            <div
                className='h-full rounded-chip transition-all'
                style={{
                    width: `${donePct}%`,
                    backgroundColor: project?.color ?? 'var(--color-now-accent)'
                }}
            />
        </div>
    </header>
);
