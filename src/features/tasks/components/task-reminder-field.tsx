import { formLabelClass } from '@/components/ui/forms/form-field-styles';
import { OffsetChips } from '@/features/notifications/components/offset-chips';
import { offsetLabel, type OffsetMode } from '@/features/notifications/utils/reminder-offsets';

type TaskReminderFieldProps = {
    /** "Due" or "Scheduled"; names the group and its controls. */
    label: string;
    mode: OffsetMode;
    custom: readonly number[];
    /** The profile's offsets, shown on the Default option. */
    profileOffsets: readonly number[];
    onModeChange: (mode: OffsetMode) => void;
    onCustomChange: (next: number[]) => void;
};

const MODES: ReadonlyArray<{ mode: OffsetMode; text: (profile: readonly number[]) => string }> = [
    {
        mode: 'default',
        text: (profile) =>
            `Default (${profile.length ? profile.map(offsetLabel).join(', ') : 'none'})`
    },
    { mode: 'none', text: () => 'None' },
    { mode: 'custom', text: () => 'Custom' }
];

/** Default / None / Custom reminder control for one of a task's dates. */
export const TaskReminderField = ({
    label,
    mode,
    custom,
    profileOffsets,
    onModeChange,
    onCustomChange
}: TaskReminderFieldProps) => (
    <div>
        <span className={formLabelClass} id={`reminder-${label}-label`}>
            {label} reminders
        </span>
        <div
            role='radiogroup'
            aria-labelledby={`reminder-${label}-label`}
            className='flex flex-wrap gap-1.5'
        >
            {MODES.map((option) => {
                const selected = option.mode === mode;
                return (
                    <button
                        key={option.mode}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        onClick={() => onModeChange(option.mode)}
                        className={`min-h-[28px] pointer-coarse:min-h-[44px] rounded-button border px-3 text-meta outline-none transition-colors ${
                            selected
                                ? 'text-text-primary'
                                : 'text-text-faint hover:text-text-secondary'
                        }`}
                        style={{
                            borderColor: selected
                                ? 'var(--color-now-accent)'
                                : 'rgba(255,255,255,.1)'
                        }}
                    >
                        {option.text(profileOffsets)}
                    </button>
                );
            })}
        </div>
        {mode === 'custom' && (
            <div className='mt-2'>
                <OffsetChips
                    label={`${label} reminders`}
                    value={custom}
                    onChange={onCustomChange}
                />
            </div>
        )}
    </div>
);
