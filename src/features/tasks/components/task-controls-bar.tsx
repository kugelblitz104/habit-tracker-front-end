import type { ProjectRead } from '@/api';
import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { Button } from '@/components/ui/buttons/button';
import { fieldClass } from '@/components/ui/forms/field-tiers';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { SelectOption } from '@/components/ui/forms/select-option';
import { toLocalDateString } from '@/lib/date-utils';
import {
    Checkbox,
    Field,
    Label as HeadlessLabel,
    Popover,
    PopoverButton,
    PopoverPanel
} from '@headlessui/react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Download, ListChecks, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_ORDER, STATUS_META } from './status-config';
import {
    activeFilterChips,
    activeFilterCount,
    ALL_PRIORITY_VALUES,
    ALL_STATUS_VALUES,
    DEFAULT_TASK_CONTROLS,
    PRIORITY_LABELS,
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

const selectStyle = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark' as const
};
const labelClass =
    'font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-text-faint';

/** Mono caption + control, wrapped in a `<label>` so clicking the caption
 *  focuses the control. Only for controls where that's valid HTML — a
 *  popover trigger button is not a labelable element, so those use
 *  `FilterField` instead. */
const SelectField = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className='flex flex-col gap-1'>
        <span className={labelClass}>{label}</span>
        {children}
    </label>
);

/** Same mono caption as `SelectField`, but in a `<div>`, for the Filters
 *  trigger and the Priority / Status / Date bodies inside it, none of which may
 *  be wrapped in a `<label>` (a popover trigger button is not a labelable
 *  element). */
const FilterField = ({
    label,
    className = '',
    children
}: {
    label: string;
    className?: string;
    children: ReactNode;
}) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <span className={labelClass}>{label}</span>
        {children}
    </div>
);

/** The Filters panel body. One column on a phone, four across from `sm`, with
 *  Date taking the slack since its inputs are the widest. */
const filterGridClass = 'flex flex-col gap-3 p-2 sm:flex-row sm:items-start sm:gap-5';

/** Same chrome as the native `<select>`s above (`fieldClass('compact')`), plus
 *  the flex layout for a button's icon/badge and the hover treatment a select
 *  doesn't need. */
const filterButtonClass = `${fieldClass('compact')} flex items-center gap-1 hover:text-text-primary`;

const checkboxRowClass =
    'flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary hover:bg-white/5';

const quickActionClass =
    'font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint hover:text-text-secondary';

type CheckboxOption = { value: number; label: string; color?: string };

type CheckboxFilterListProps = {
    options: CheckboxOption[];
    allValues: number[];
    selected: number[];
    onChange: (next: number[]) => void;
};

/**
 * Themed checkbox list, the body shared by the multi-select Status and
 * Priority filters. Rendered inline inside the Filters popover panel rather
 * than in its own `Popover`, since a nested Headless UI `Popover` would fight
 * the outer one's dismiss handler. Toggling a row updates the `selected`
 * array via set membership, not index.
 */
const CheckboxFilterList = ({
    options,
    allValues,
    selected,
    onChange
}: CheckboxFilterListProps) => {
    const toggle = (value: number, checked: boolean) => {
        onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
    };

    return (
        <div>
            <div className='flex items-center justify-between gap-2 px-2 pb-1'>
                <Button
                    variant='subtle'
                    size='sm'
                    className={quickActionClass}
                    style={{ fontSize: '10px' }}
                    onClick={() => onChange([...allValues])}
                >
                    All
                </Button>
                <Button
                    variant='subtle'
                    size='sm'
                    className={quickActionClass}
                    style={{ fontSize: '10px' }}
                    onClick={() => onChange([])}
                >
                    None
                </Button>
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
        </div>
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
    {
        label: '7 days',
        range: () => ({ dateFrom: daysAgo(6), dateTo: toLocalDateString(new Date()) })
    },
    {
        label: '2 weeks',
        range: () => ({ dateFrom: daysAgo(13), dateTo: toLocalDateString(new Date()) })
    },
    {
        label: '3 weeks',
        range: () => ({ dateFrom: daysAgo(20), dateTo: toLocalDateString(new Date()) })
    },
    {
        label: '30 days',
        range: () => ({ dateFrom: daysAgo(29), dateTo: toLocalDateString(new Date()) })
    },
    {
        label: 'This month',
        range: () => ({ dateFrom: startOfThisMonth(), dateTo: toLocalDateString(new Date()) })
    }
];

const presetButtonClass =
    'rounded-button border px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary transition-colors hover:text-text-primary';

type DateFilterFieldsProps = {
    controls: TaskControlsState;
    onChange: (patch: Partial<TaskControlsState>) => void;
};

/**
 * Date-range filter body: pick a date field (Due / Scheduled / Completed /
 * Created), then a preset window or a custom From/To range (inclusive). No
 * field selected = no date filtering. Rendered inline inside the Filters
 * popover panel rather than in its own `Popover`, same as `CheckboxFilterList`.
 */
const DateFilterFields = ({ controls, onChange }: DateFilterFieldsProps) => {
    const { dateField, dateFrom, dateTo } = controls;

    return (
        <div className='flex flex-col gap-2'>
            <SelectField label='Filter by'>
                <Select
                    tier='compact'
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
                    <SelectOption value='none'>No date filter</SelectOption>
                    {DATE_FIELD_OPTIONS.map((o) => (
                        <SelectOption key={o.value} value={o.value}>
                            {o.label}
                        </SelectOption>
                    ))}
                </Select>
            </SelectField>

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
                        <Input
                            tier='compact'
                            type='date'
                            value={dateFrom}
                            aria-label='From date'
                            onChange={(e) => onChange({ dateFrom: e.target.value })}
                        />
                    </label>
                    <label className='flex items-center justify-between gap-2'>
                        <span className={labelClass}>To</span>
                        <Input
                            tier='compact'
                            type='date'
                            value={dateTo}
                            aria-label='To date'
                            onChange={(e) => onChange({ dateTo: e.target.value })}
                        />
                    </label>
                    <Button
                        variant='subtle'
                        size='sm'
                        className={`${quickActionClass} self-start`}
                        style={{ fontSize: '10px' }}
                        onClick={() => onChange({ dateFrom: '', dateTo: '' })}
                    >
                        Clear range
                    </Button>
                </>
            )}
        </div>
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

    const count = activeFilterCount(controls);
    const chips = activeFilterChips(controls, projects);

    return (
        <div className='mb-5 flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
                {/* Filters: Project (view-dependent) + Priority + Status + Date, all
                    collapsed behind one popover with an honest active-filter count.
                    The bodies below render inline rather than as their own nested
                    `Popover`s, which would fight this one's dismiss handler. */}
                <FilterField label='Filter'>
                    <Popover className='relative'>
                        <PopoverButton className={filterButtonClass} style={selectStyle}>
                            Filters
                            {count > 0 && (
                                <span className='font-semibold text-now-accent'>({count})</span>
                            )}
                            <ChevronDown size={12} />
                        </PopoverButton>
                        <PopoverPanel
                            anchor='bottom start'
                            // One column on a phone; from `sm` the four categories run
                            // across so the panel fits on screen instead of running off
                            // the bottom of a 720px viewport.
                            className={`${POPOVER_PANEL_CLASS} mt-1 w-64 sm:w-[680px] sm:max-w-[calc(100vw-2rem)]`}
                            style={popoverPanelStyle}
                        >
                            <div className={filterGridClass}>
                                {showProjectOptions && (
                                    <FilterField label='Project' className='sm:w-[140px]'>
                                        <Select
                                            tier='compact'
                                            value={String(controls.filterProjectId)}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                set({
                                                    filterProjectId:
                                                        v === 'all' || v === 'none' ? v : Number(v)
                                                });
                                            }}
                                        >
                                            <SelectOption value='all'>All projects</SelectOption>
                                            <SelectOption value='none'>No project</SelectOption>
                                            {projects.map((project) => (
                                                <SelectOption key={project.id} value={project.id}>
                                                    {project.name}
                                                    {project.archived ? ' (archived)' : ''}
                                                </SelectOption>
                                            ))}
                                        </Select>
                                    </FilterField>
                                )}

                                <FilterField label='Priority' className='sm:w-[120px]'>
                                    <CheckboxFilterList
                                        options={[3, 2, 1, 0].map((p) => ({
                                            value: p,
                                            label: PRIORITY_LABELS[p]!
                                        }))}
                                        allValues={ALL_PRIORITY_VALUES}
                                        selected={controls.filterPriorities}
                                        onChange={(next) => set({ filterPriorities: next })}
                                    />
                                </FilterField>

                                {/* Done/Cancelled default off, closed tasks live in the
                                    separate Closed section instead. */}
                                <FilterField label='Status' className='sm:w-[140px]'>
                                    <CheckboxFilterList
                                        options={STATUS_ORDER.map((s) => ({
                                            value: s,
                                            label: STATUS_META[s].label,
                                            color: STATUS_META[s].color
                                        }))}
                                        allValues={ALL_STATUS_VALUES}
                                        selected={controls.filterStatuses}
                                        onChange={(next) => set({ filterStatuses: next })}
                                    />
                                </FilterField>

                                <FilterField label='Date' className='sm:min-w-[200px] sm:flex-1'>
                                    <DateFilterFields controls={controls} onChange={set} />
                                </FilterField>
                            </div>
                        </PopoverPanel>
                    </Popover>
                </FilterField>

                {/* Sort and Group stay visible: both arrange the list rather than
                    filter it, and neither counts toward the Filters badge. */}
                <SelectField label='Sort'>
                    <div className='flex items-center gap-1'>
                        <Select
                            tier='compact'
                            value={controls.sortBy}
                            onChange={(e) => set({ sortBy: e.target.value as TaskSortBy })}
                        >
                            <SelectOption value='smart'>Smart</SelectOption>
                            <SelectOption value='priority'>Priority</SelectOption>
                            <SelectOption value='due'>Due date</SelectOption>
                            <SelectOption value='created'>Created</SelectOption>
                            <SelectOption value='title'>Title</SelectOption>
                            <SelectOption value='status'>Status</SelectOption>
                        </Select>
                        <Button
                            variant='icon'
                            size='sm'
                            onClick={() =>
                                set({ sortDir: controls.sortDir === 'asc' ? 'desc' : 'asc' })
                            }
                            aria-label={`Sort ${
                                controls.sortDir === 'asc' ? 'ascending' : 'descending'
                            }`}
                            title={controls.sortDir === 'asc' ? 'Ascending' : 'Descending'}
                            style={selectStyle}
                        >
                            {controls.sortDir === 'asc' ? (
                                <ArrowUp size={13} />
                            ) : (
                                <ArrowDown size={13} />
                            )}
                        </Button>
                    </div>
                </SelectField>

                <SelectField label='Group'>
                    <Select
                        tier='compact'
                        value={controls.groupBy}
                        onChange={(e) => set({ groupBy: e.target.value as TaskGroupBy })}
                    >
                        <SelectOption value='none'>None</SelectOption>
                        {showProjectOptions && <SelectOption value='project'>Project</SelectOption>}
                        <SelectOption value='priority'>Priority</SelectOption>
                        <SelectOption value='status'>Status</SelectOption>
                    </Select>
                </SelectField>

                {/* Trailing actions: Reset (only when something's changed) + Select + Export. */}
                <div className='ml-auto flex items-center gap-3'>
                    {!isDefaultControls(controls) && (
                        <Button
                            variant='subtle'
                            size='sm'
                            onClick={() => onChange(DEFAULT_TASK_CONTROLS)}
                            className={quickActionClass}
                            style={{ fontSize: '10px' }}
                            title='Reset grouping, sort and filters to defaults'
                        >
                            Reset
                        </Button>
                    )}
                    {onToggleSelection && (
                        <Button
                            variant='icon'
                            size='sm'
                            onClick={onToggleSelection}
                            style={selectStyle}
                            title={selectionActive ? 'Exit multi-select' : 'Select multiple tasks'}
                        >
                            <ListChecks size={12} />
                            {selectionActive ? 'Done' : 'Select'}
                        </Button>
                    )}
                    {onExport && (
                        <Button
                            variant='icon'
                            size='sm'
                            onClick={onExport}
                            style={selectStyle}
                            title='Export this view as Markdown'
                        >
                            <Download size={12} />
                            Export
                        </Button>
                    )}
                </div>
            </div>

            {count > 0 && (
                <div className='flex flex-wrap gap-[6px]'>
                    {chips.map((chip) => (
                        <span
                            key={chip.key}
                            className='inline-flex max-w-[240px] items-center gap-[6px] rounded-chip border py-[2px] pr-[6px] pl-[10px] text-[12px] text-text-secondary'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                            title={chip.label}
                        >
                            <span className='truncate'>{chip.label}</span>
                            <button
                                type='button'
                                aria-label={`Remove filter: ${chip.label}`}
                                onClick={() => set(chip.reset)}
                                className='text-text-muted hover:text-text-primary'
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
