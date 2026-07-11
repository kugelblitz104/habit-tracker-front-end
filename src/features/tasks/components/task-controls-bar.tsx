import type { ProjectRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { STATUS_ORDER, STATUS_META } from './status-config';
import { selectOptionStyle } from './task-form-fields';
import {
    PRIORITY_LABELS,
    type TaskControlsState,
    type TaskGroupBy,
    type TaskSortBy
} from '../utils/task-controls';

type TaskControlsBarProps = {
    controls: TaskControlsState;
    onChange: (next: TaskControlsState) => void;
    projects: ProjectRead[];
    /** Project view fixes the project, so its project group/filter are hidden. */
    showProjectOptions?: boolean;
};

const selectClass =
    'rounded-button border px-2 py-1 font-mono text-[11px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';
const selectStyle = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark' as const
};
const labelClass =
    'font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-text-faint';

/**
 * Compact sort / group / filter bar for the flat task surfaces. Purely
 * presentational — it edits a `TaskControlsState` the parent owns (and
 * persists). Filtering by project/priority/status and grouping by the same
 * dimensions; the smart sort mirrors the server's default band ordering.
 */
export const TaskControlsBar = ({
    controls,
    onChange,
    projects,
    showProjectOptions = true
}: TaskControlsBarProps) => {
    const set = (patch: Partial<TaskControlsState>) => onChange({ ...controls, ...patch });

    return (
        <div className='mb-5 flex flex-wrap items-end gap-x-4 gap-y-3'>
            {/* Group by */}
            <label className='flex flex-col gap-1'>
                <span className={labelClass}>Group</span>
                <select
                    className={selectClass}
                    style={selectStyle}
                    value={controls.groupBy}
                    onChange={(e) => set({ groupBy: e.target.value as TaskGroupBy })}
                >
                    <option style={selectOptionStyle} value='none'>
                        None
                    </option>
                    {showProjectOptions && (
                        <option style={selectOptionStyle} value='project'>
                            Project
                        </option>
                    )}
                    <option style={selectOptionStyle} value='priority'>
                        Priority
                    </option>
                    <option style={selectOptionStyle} value='status'>
                        Status
                    </option>
                </select>
            </label>

            {/* Sort by (+ direction) */}
            <label className='flex flex-col gap-1'>
                <span className={labelClass}>Sort</span>
                <div className='flex items-center gap-1'>
                    <select
                        className={selectClass}
                        style={selectStyle}
                        value={controls.sortBy}
                        onChange={(e) => set({ sortBy: e.target.value as TaskSortBy })}
                    >
                        <option style={selectOptionStyle} value='smart'>
                            Smart
                        </option>
                        <option style={selectOptionStyle} value='priority'>
                            Priority
                        </option>
                        <option style={selectOptionStyle} value='due'>
                            Due date
                        </option>
                        <option style={selectOptionStyle} value='created'>
                            Created
                        </option>
                        <option style={selectOptionStyle} value='title'>
                            Title
                        </option>
                        <option style={selectOptionStyle} value='status'>
                            Status
                        </option>
                    </select>
                    <button
                        type='button'
                        onClick={() =>
                            set({ sortDir: controls.sortDir === 'asc' ? 'desc' : 'asc' })
                        }
                        aria-label={`Sort ${
                            controls.sortDir === 'asc' ? 'ascending' : 'descending'
                        }`}
                        title={controls.sortDir === 'asc' ? 'Ascending' : 'Descending'}
                        className='rounded-button border p-1 text-text-secondary transition-colors hover:text-text-primary'
                        style={selectStyle}
                    >
                        {controls.sortDir === 'asc' ? (
                            <ArrowUp size={13} />
                        ) : (
                            <ArrowDown size={13} />
                        )}
                    </button>
                </div>
            </label>

            {/* Filter: project */}
            {showProjectOptions && (
                <label className='flex flex-col gap-1'>
                    <span className={labelClass}>Project</span>
                    <select
                        className={selectClass}
                        style={selectStyle}
                        value={String(controls.filterProjectId)}
                        onChange={(e) => {
                            const v = e.target.value;
                            set({
                                filterProjectId: v === 'all' || v === 'none' ? v : Number(v)
                            });
                        }}
                    >
                        <option style={selectOptionStyle} value='all'>
                            All projects
                        </option>
                        <option style={selectOptionStyle} value='none'>
                            No project
                        </option>
                        {projects.map((project) => (
                            <option style={selectOptionStyle} key={project.id} value={project.id}>
                                {project.name}
                                {project.archived ? ' (archived)' : ''}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {/* Filter: priority */}
            <label className='flex flex-col gap-1'>
                <span className={labelClass}>Priority</span>
                <select
                    className={selectClass}
                    style={selectStyle}
                    value={String(controls.filterPriority)}
                    onChange={(e) => {
                        const v = e.target.value;
                        set({ filterPriority: v === 'all' ? 'all' : Number(v) });
                    }}
                >
                    <option style={selectOptionStyle} value='all'>
                        Any
                    </option>
                    {[3, 2, 1, 0].map((p) => (
                        <option style={selectOptionStyle} key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                        </option>
                    ))}
                </select>
            </label>

            {/* Filter: status */}
            <label className='flex flex-col gap-1'>
                <span className={labelClass}>Status</span>
                <select
                    className={selectClass}
                    style={selectStyle}
                    value={String(controls.filterStatus)}
                    onChange={(e) => {
                        const v = e.target.value;
                        set({ filterStatus: v === 'all' ? 'all' : Number(v) });
                    }}
                >
                    <option style={selectOptionStyle} value='all'>
                        Any
                    </option>
                    {STATUS_ORDER.map((s) => (
                        <option style={selectOptionStyle} key={s} value={s}>
                            {STATUS_META[s].label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
};
