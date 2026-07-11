import { useProjects } from '@/features/projects/api/get-projects';
import { EntitySelect } from './entity-select';

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
    const options = projects.map((project) => ({
        value: project.id,
        label: project.archived ? `${project.name} (archived)` : project.name
    }));

    return (
        <EntitySelect
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            options={options}
            placeholder='No project'
        />
    );
};
