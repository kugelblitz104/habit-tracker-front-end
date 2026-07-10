import {
    formFieldClass,
    formFieldStyle,
    selectOptionStyle
} from '@/features/tasks/components/task-form-fields';
import { useProjects } from '@/features/projects/api/get-projects';

type ProjectSelectProps = {
    profileId: number | null | undefined;
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    id?: string;
};

/**
 * Dropdown for attaching adhoc (task-less) time to a project. Archived projects
 * are excluded unless already selected. Fetches the profile's projects itself.
 */
export const ProjectSelect = ({ profileId, value, onChange, disabled, id }: ProjectSelectProps) => {
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const projects = (projectsQuery.data?.projects ?? []).filter(
        (project) => !project.archived || project.id === value
    );

    return (
        <select
            id={id}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className={`${formFieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
        </select>
    );
};
