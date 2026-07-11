import { useCreateProject } from '@/features/projects/api/create-projects';
import { useProjects } from '@/features/projects/api/get-projects';
import { randomProjectColor } from '@/features/projects/utils/project-colors';
import { Check, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import {
    formFieldClass,
    formFieldStyle,
    formLabelClass,
    selectOptionStyle
} from './task-form-fields';

type ProjectFieldProps = {
    /** Profile whose projects populate the dropdown (self-fetched). */
    profileId: number;
    value: number | null;
    onChange: (value: number | null) => void;
    id?: string;
    /** Open straight into inline-create mode with this name pre-filled (used by
     *  quick-add when an `@name` token matched no existing project). */
    initialCreatingName?: string;
};

/** Sentinel option value that swaps the select for the inline create input. */
const CREATE_PROJECT_OPTION = '__create-project__';

/**
 * Project dropdown that fetches the profile's projects itself. Archived
 * projects are hidden from the options — unless the task's CURRENT project is
 * archived, which stays visible as the selected value so the task doesn't look
 * unassigned. A trailing "＋ New project…" option swaps the select for a small
 * name input (confirm/cancel); the created project (random palette color, both
 * editable later on the project view) is selected on success.
 */
export const ProjectField = ({
    profileId,
    value,
    onChange,
    id,
    initialCreatingName
}: ProjectFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-project-${generatedId}`;
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const createProject = useCreateProject();
    const [isCreating, setIsCreating] = useState(!!initialCreatingName);
    const [newName, setNewName] = useState(initialCreatingName ?? '');

    const allProjects = projectsQuery.data?.projects ?? [];
    const projects = allProjects.filter((project) => !project.archived || project.id === value);

    const cancelCreate = () => {
        setIsCreating(false);
        setNewName('');
    };

    const confirmCreate = () => {
        const name = newName.trim();
        if (!name || createProject.isPending) return;
        createProject.mutate(
            { profile_id: profileId, name, color: randomProjectColor() },
            {
                onSuccess: (data) => {
                    onChange(data.id);
                    cancelCreate();
                },
                onError: () => toast.error('Failed to create project. Please try again.')
            }
        );
    };

    const handleCreateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter/Escape so the host form doesn't submit and the host
        // pane/editor doesn't close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            confirmCreate();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelCreate();
        }
    };

    return (
        <div>
            <label className={formLabelClass} htmlFor={isCreating ? `${fieldId}-new` : fieldId}>
                Project
            </label>
            {isCreating ? (
                <div className='flex items-center gap-1.5'>
                    <input
                        id={`${fieldId}-new`}
                        type='text'
                        autoFocus
                        value={newName}
                        disabled={createProject.isPending}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        placeholder='New project name…'
                        aria-label='New project name'
                        className={`${formFieldClass} placeholder:text-text-faint disabled:opacity-50`}
                        style={formFieldStyle}
                    />
                    <button
                        type='button'
                        onClick={confirmCreate}
                        disabled={!newName.trim() || createProject.isPending}
                        aria-label='Create project'
                        title='Create project'
                        className='shrink-0 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <Check size={14} />
                    </button>
                    <button
                        type='button'
                        onClick={cancelCreate}
                        disabled={createProject.isPending}
                        aria-label='Cancel new project'
                        title='Cancel'
                        className='shrink-0 rounded-button border p-1.5 text-text-faint transition-colors hover:text-text-secondary disabled:opacity-50'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <select
                    id={fieldId}
                    value={value ?? ''}
                    onChange={(e) => {
                        if (e.target.value === CREATE_PROJECT_OPTION) {
                            setIsCreating(true);
                            return;
                        }
                        onChange(e.target.value === '' ? null : Number(e.target.value));
                    }}
                    className={formFieldClass}
                    style={{ ...formFieldStyle, colorScheme: 'dark' }}
                >
                    <option style={selectOptionStyle} value=''>
                        No project
                    </option>
                    {projects.map((project) => (
                        <option style={selectOptionStyle} key={project.id} value={project.id}>
                            {project.name}
                            {project.archived ? ' (archived)' : ''}
                        </option>
                    ))}
                    <option style={selectOptionStyle} value={CREATE_PROJECT_OPTION}>
                        ＋ New project…
                    </option>
                </select>
            )}
        </div>
    );
};
