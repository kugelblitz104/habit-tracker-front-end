import { compactFieldClass, compactFieldStyle } from '@/components/ui/forms/form-field-styles';
import { SelectOption } from '@/components/ui/forms/select-option';
import { CategoryField } from '@/features/countdowns/components/category-field';
import { REPEAT_OPTIONS, type CountdownRepeat } from '@/features/countdowns/utils/countdown';
import { TaskSelect } from '@/features/time-entries/components/task-select';

const inputClass = `${compactFieldClass} placeholder:text-text-faint`;
const inputStyle = compactFieldStyle;
const labelCls =
    'mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

export type CountdownFormValues = {
    title: string;
    date: string;
    time: string;
    taskId: number | null;
    categoryId: number | null;
    repeat: CountdownRepeat;
    showOccurrence: boolean;
};

type CountdownFormFieldsProps = {
    profileId: number;
    values: CountdownFormValues;
    onChange: (patch: Partial<CountdownFormValues>) => void;
    disabled?: boolean;
    /** Id for the linked-task select, mirroring the old `countdown-task-${id}` /
     *  `countdown-task-new` scheme so no DOM id changes. */
    fieldId: string;
    /** Pre-fills the group field's inline-create input (used by quick-add). */
    initialCreatingGroupName?: string;
    /** Called on a plain Enter in the title field (used by quick-add). */
    onTitleEnter?: () => void;
};

/**
 * The countdown field block: title, When (date + time), Repeat + occurrence
 * checkbox, group, linked task. Controlled: owns no state of its own, so the
 * inline editor and the quick-add expanded form can share it.
 */
export const CountdownFormFields = ({
    profileId,
    values,
    onChange,
    disabled,
    fieldId,
    initialCreatingGroupName,
    onTitleEnter
}: CountdownFormFieldsProps) => {
    const { title, date, time, taskId, categoryId, repeat, showOccurrence } = values;

    return (
        <div className='flex flex-col gap-3.5'>
            <div>
                <div className={labelCls}>Title</div>
                <input
                    type='text'
                    value={title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && onTitleEnter) {
                            e.preventDefault();
                            onTitleEnter();
                        }
                    }}
                    placeholder='What are you counting down to?'
                    aria-label='Countdown title'
                    autoFocus
                    className={`${inputClass} w-full`}
                    style={inputStyle}
                />
            </div>

            <div>
                <div className={labelCls}>When</div>
                <div className='flex flex-wrap items-center gap-2'>
                    <input
                        type='date'
                        value={date}
                        onChange={(e) => onChange({ date: e.target.value })}
                        aria-label='Target date'
                        className={inputClass}
                        style={inputStyle}
                    />
                    <input
                        type='time'
                        value={time}
                        onChange={(e) => onChange({ time: e.target.value })}
                        aria-label='Target time (optional)'
                        className={inputClass}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div>
                <div className={labelCls}>Repeat</div>
                <select
                    value={repeat}
                    onChange={(e) => onChange({ repeat: e.target.value as CountdownRepeat })}
                    aria-label='Repeat'
                    className={`${inputClass} w-full`}
                    style={inputStyle}
                >
                    {REPEAT_OPTIONS.map((o) => (
                        <SelectOption key={o.value} value={o.value}>
                            {o.label}
                        </SelectOption>
                    ))}
                </select>
                {repeat !== 'none' && (
                    <label className='mt-2 flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-text-muted'>
                        <input
                            type='checkbox'
                            checked={showOccurrence}
                            onChange={(e) => onChange({ showOccurrence: e.target.checked })}
                            className='h-3.5 w-3.5 cursor-pointer accent-[var(--color-now-accent)]'
                        />
                        Count occurrences (e.g. 26th)
                    </label>
                )}
            </div>

            <CategoryField
                profileId={profileId}
                value={categoryId}
                onChange={(v) => onChange({ categoryId: v })}
                initialCreatingName={initialCreatingGroupName}
            />

            <div>
                <div className={labelCls}>Linked task</div>
                <TaskSelect
                    profileId={profileId}
                    value={taskId}
                    onChange={(v) => onChange({ taskId: v })}
                    disabled={disabled}
                    id={fieldId}
                />
            </div>
        </div>
    );
};
