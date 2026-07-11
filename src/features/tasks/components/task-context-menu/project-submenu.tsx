import type { ProjectRead } from '@/api';
import { Check } from 'lucide-react';
import { CURRENT_BG, Divider, SubHeader, itemClass } from './shared';

type ProjectSubmenuProps = {
    /** Archived-aware project list — filtering already applied by the caller. */
    projects: ProjectRead[];
    currentProjectId: number | null | undefined;
    onSelect: (projectId: number | null) => void;
    onBack: () => void;
};

/** "Move to project" submenu: "No project" + the profile's (archived-aware) projects. */
export const ProjectSubmenu = ({
    projects,
    currentProjectId,
    onSelect,
    onBack
}: ProjectSubmenuProps) => (
    <>
        <SubHeader label='Move to project' onBack={onBack} />
        <Divider />
        <button
            type='button'
            onClick={() => onSelect(null)}
            className={`${itemClass} text-text-secondary`}
            style={currentProjectId == null ? { backgroundColor: CURRENT_BG } : undefined}
        >
            <span className='inline-block h-2 w-2 shrink-0 rounded-full border border-text-faint' />
            No project
            {currentProjectId == null && (
                <Check size={14} className='ml-auto text-now-accent' strokeWidth={3} />
            )}
        </button>
        {projects.map((project) => {
            const isCurrent = project.id === currentProjectId;
            return (
                <button
                    key={project.id}
                    type='button'
                    onClick={() => onSelect(project.id)}
                    className={`${itemClass} text-text-secondary`}
                    style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                >
                    <span
                        className='inline-block h-2 w-2 shrink-0 rounded-full'
                        style={{ backgroundColor: project.color }}
                    />
                    <span className='min-w-0 truncate'>
                        {project.name}
                        {project.archived ? ' (archived)' : ''}
                    </span>
                    {isCurrent && (
                        <Check
                            size={14}
                            className='ml-auto shrink-0 text-now-accent'
                            strokeWidth={3}
                        />
                    )}
                </button>
            );
        })}
    </>
);
