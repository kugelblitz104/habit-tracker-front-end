import type { ProjectRead } from '@/api';
import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { toLocalDateString } from '@/lib/date-utils';
import { Checkbox, Field, Label as HeadlessLabel, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Download, ListChecks } from 'lucide-react';
import { STATUS_ORDER, STATUS_META } from './status-config';
import { selectOptionStyle } from './task-form-fields';
import {
    ALL_PRIORITY_VALUES,
    ALL_STATUS_VALUES,
    DEFAULT_TASK_CONTROLS,
    PRIORITY_LABELS,
    TASK_DATE_FIELD_LABELS,
    isDefaultControls,
    type TaskControlsState,
    type TaskDateField,
    type TaskGroupBy,
    type TaskSortBy
} from '../utils/task-controls';

type TaskControlsBarProps = {
    controls: TaskControlsState;
    onChange: (next: TaskControlsState) => void;
    projects: ProjectRead[];
    /** Project view fixes the project, so its project group/filter are hidden. */
    showProjectOptions?: boolean;
    /** Export the currently filtered/grouped/sorted view as Markdown. Omit to
     *  hide the Export button. */
    onExport?: () => void;
    /** Enter/exit multi-select mode. Omit to hide the Select button. */
    onToggleSelection?: () => void;
    /** Whether multi-select mode is currently active (flips Select ⇄ Done). */
    selectionActive?: boolean;
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

/** Same chrome as the native `<select>`s above, but as a button that opens a
 *  checkbox popover instead of a listbox. */
const filterButtonClass =
    'flex items-center gap-1 rounded-button border px-2 py-1 font-mono text-[11px] text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-1 focus-visible:ring-now-accent';

const checkboxRowClass =
    'flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary hover:bg-white/5';

const quickActionClass =
    'font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint hover:text-text-secondary';

type CheckboxOption = { value: number; label: string; color?: string };

type CheckboxFilterPopoverProps = {
    label: string;
    options: CheckboxOption[];
    allValues: number[];
    selected: number[];
    onChange: (next: number[]) => void;
};

/**
 * Themed checkbox-list popover — used for the multi-select Status and
 * Priority filters. Reuses the app's shared popover panel chrome
 * (POPOVER_PANEL_CLASS/popoverPanelStyle); toggling a row updates the
 * `selected` array via set membership, not index.
 */
const CheckboxFilterPopover = ({
    label,
    options,
    allValues,
    selected,
    onChange
}: CheckboxFilterPopoverProps) => {
    const toggle = (value: number, checked: boolean) => {
        onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
    };

    const summary =
        selected.length === 0
            ? `${label}: None`
            : selected.length === allValues.length
            ? `${label}: All`
            : `${label} (${selected.length})`;

    return (
        <Popover className='relative'>
            <PopoverButton className={filterButtonClass} style={selectStyle}>
                {summary}
                <ChevronDown size={12} />
            </PopoverButton>
            <PopoverPanel
                anchor='bottom start'
                className={`${POPOVER_PANEL_CLASS} mt-1 w-48`}
                style={popoverPanelStyle}
            >
                <div className='flex items-center justify-between gap-2 px-2 pb-1'>
                    <button
                        type='button'
                        className={quickActionClass}
                        onClick={() => onChange([...allValues])}
                    >
                        All
                    </button>
                    <button
                        type='button'
                        className={quickActionClass}
                        onClick={() => onChange([])}
                    >
                        None
                    </button>
                </div>
                {options.map((option) => (
                    <Field key={option.value} className={checkboxRowClass}>
                        <Checkbox
                            checked={selected.includes(option.value)}
                            onChange={(checked) => toggle(option.value, checked)}
                            className='group flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border data-checked:border-now-accent data-checked:bg-now-accent'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                        >
                            <Check
                                size={10}
                                className='hidden text-bg group-data-checked:block'
                                style={{ color: 'var(--bg)' }}
                            />
                        </Checkbox>
                        <HeadlessLabel
                            className='min-w-0 flex-1 cursor-pointer truncate select-none'
                            style={option.color ? { color: option.color } : undefined}
                        >
                            {option.label}
                        </HeadlessLabel>
                    </Field>
                ))}
            </PopoverPanel>
        </Popover>
    );
};

const DATE_FIELD_OPTIONS: { value: TaskDateField; label: string }[] = [
    { value: 'due', label: 'Due date' },
    { value: 'scheduled', label: 'Scheduled date' },
    { value: 'completed', label: 'Completed date' },
    { value: 'created', label: 'Created date' }
];

const daysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toLocalDateString(d);
};
const startOfThisMonth = (): string => {
    const d = new Date();
    return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
};

// Quick presets, all ending "today". Ranges are computed on click so "today"
// is always current (no stale bound baked in at render).
const DATE_PRESETS: { label: string; range: () => { dateFrom: string; dateTo: string } }[] = [
    { label: '7 days', range: () => ({ dateFrom: daysAgo(6), dateTo: toLocalDateString(new Date()) }) },
    { label: '2 weeks', range: () => ({ dateFrom: daysAgo(13), dateTo: toLocalDateString(new Date()) }) },
    { label: '3 weeks', range: () => ({ dateFrom: daysAgo(20), dateTo: toLocalDateString(new Date()) }) },
    { label: '30 days', range: () => ({ dateFrom: daysAgo(29), dateTo: toLocalDateString(new Date()) }) },
    { label: 'This month', range: () => ({ dateFrom: startOfThisMonth(), dateTo: toLocalDateString(new Date()) }) }
];

const presetButtonClass =
    'rounded-button border px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary transition-colors hover:text-text-primary';

type DateFilterPopoverProps = {
    controls: TaskControlsState;
    onChange: (patch: Partial<TaskControlsState>) => void;
};

/**
 * Date-range filter popover: pick a date field (Due / Scheduled / Completed /
 * Created), then a preset window or a custom From/To range (inclusive). No
 * field selected = no date filtering. Follows the same popover chrome as the
 * checkbox filters.
 */
const DateFilterPopover = ({ controls, onChange }: DateFilterPopoverProps) => {
    const { dateField, dateFrom, dateTo } = controls;
    const summary = !dateField
        ? 'Date: Any'
        : `${TASK_DATE_FIELD_LABELS[dateField]}${
              dateFrom || dateTo ? `: ${dateFrom || '…'} → ${dateTo || '…'}` : ''
          }`;

    return (
        <Popover className='relative'>
            <PopoverButton className={filterButtonClass} style={selectStyle}>
                {summary}
                <ChevronDown size={12} />
            </PopoverButton>
            <PopoverPanel
                anchor='bottom start'
                className={`${POPOVER_PANEL_CLASS} mt-1 w-64`}
                style={popoverPanelStyle}
            >
                <div className='flex flex-col gap-2 p-2'>
                    <label className='flex flex-col gap-1'>
                        <span className={labelClass}>Filter by</span>
                        <select
                            className={selectClass}
                            style={selectStyle}
                            value={dateField ?? 'none'}
                            onChange={(e) => {
                                const v = e.target.value;
                                onChange(
                                    v === 'none'
                                        ? { dateField: null, dateFrom: '', dateTo: '' }
                                        : { dateField: v as TaskDateField }
                                );
                            }}
                        >
                            <option style={selectOptionStyle} value='none'>
                                No date filter
                            </option>
                            {DATE_FIELD_OPTIONS.map((o) => (
                                <option key={o.value} style={selectOptionStyle} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {dateField && (
                        <>
                            <div className='flex flex-wrap gap-1'>
                                {DATE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type='button'
                                        className={presetButtonClass}
                                        style={selectStyle}
                                        onClick={() => onChange(preset.range())}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <label className='flex items-center justify-between gap-2'>
                                <span className={labelClass}>From</span>
                                <input
                                    type='date'
                                    className={selectClass}
                                    style={selectStyle}
                                    value={dateFrom}
                                    aria-label='From date'
                                    onChange={(e) => onChange({ dateFrom: e.target.value })}
                                />
                            </label>
                            <label className='flex items-center justify-between gap-2'>
                                <span className={labelClass}>To</span>
                                <input
                                    type='date'
                                    className={selectClass}
                                    style={selectStyle}
                                    value={dateTo}
                                    aria-label='To date'
                                    onChange={(e) => onChange({ dateTo: e.target.value })}
                                />
                            </label>
                            <button
                                type='button'
                                className={`${quickActionClass} self-start`}
                                onClick={() => onChange({ dateFrom: '', dateTo: '' })}
                            >
                                Clear range
                            </button>
                        </>
                    )}
                </div>
            </PopoverPanel>
        </Popover>
    );
};

/**
 * Compact sort / group / filter bar for the flat task surfaces. Purely
 * presentational — it edits a `TaskControlsState` the parent owns (and
 * persists). Filtering by project/priority/status/date and grouping by the same
 * dimensions; the smart sort mirrors the server's default band ordering.
 */
export const TaskControlsBar = ({
    controls,
    onChange,
    projects,
    showProjectOptions = true,
    onExport,
    onToggleSelection,
    selectionActive = false
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

            {/* Filter: priority (multi-select checkboxes) */}
            <div className='flex flex-col gap-1'>
                <span className={labelClass}>Priority</span>
                <CheckboxFilterPopover
                    label='Priority'
                    options={[3, 2, 1, 0].map((p) => ({ value: p, label: PRIORITY_LABELS[p]! }))}
                    allValues={ALL_PRIORITY_VALUES}
                    selected={controls.filterPriorities}
                    onChange={(next) => set({ filterPriorities: next })}
                />
            </div>

            {/* Filter: status (multi-select checkboxes; Done/Cancelled default off —
                closed tasks live in the separate Closed section instead). */}
            <div className='flex flex-col gap-1'>
                <span className={labelClass}>Status</span>
                <CheckboxFilterPopover
                    label='Status'
                    options={STATUS_ORDER.map((s) => ({
                        value: s,
                        label: STATUS_META[s].label,
                        color: STATUS_META[s].color
                    }))}
                    allValues={ALL_STATUS_VALUES}
                    selected={controls.filterStatuses}
                    onChange={(next) => set({ filterStatuses: next })}
                />
            </div>

            {/* Filter: date range (Due / Scheduled / Completed / Created). */}
            <div className='flex flex-col gap-1'>
                <span className={labelClass}>Date</span>
                <DateFilterPopover controls={controls} onChange={set} />
            </div>

            {/* Trailing actions: Select + Reset (only when something's changed) + Export. */}
            <div className='ml-auto flex items-end gap-3'>
                {onToggleSelection && (
                    <button
                        type='button'
                        onClick={onToggleSelection}
                        className={filterButtonClass}
                        style={selectStyle}
                        title={selectionActive ? 'Exit multi-select' : 'Select multiple tasks'}
                    >
                        <ListChecks size={12} />
                        {selectionActive ? 'Done' : 'Select'}
                    </button>
                )}
                {!isDefaultControls(controls) && (
                    <button
                        type='button'
                        onClick={() => onChange(DEFAULT_TASK_CONTROLS)}
                        className={`${quickActionClass} pb-1.5`}
                        title='Reset grouping, sort and filters to defaults'
                    >
                        Reset
                    </button>
                )}
                {onExport && (
                    <button
                        type='button'
                        onClick={onExport}
                        className={filterButtonClass}
                        style={selectStyle}
                        title='Export this view as Markdown'
                    >
                        <Download size={12} />
                        Export
                    </button>
                )}
            </div>
        </div>
    );
};
