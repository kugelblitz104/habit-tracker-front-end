import {
    formFieldClass,
    formFieldStyle,
    selectOptionStyle
} from '@/features/tasks/components/task-form-fields';

export type EntitySelectOption = {
    value: number;
    label: string;
    /** Render indented with a "└" marker (e.g. a subtask under its parent). */
    indent?: boolean;
};

type EntitySelectProps = {
    id?: string;
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    options: EntitySelectOption[];
    /** Leading "No X" option shown when nothing is selected. */
    placeholder: string;
};

/**
 * Presentational entity-attachment dropdown shared by ProjectSelect and
 * TaskSelect: a placeholder option followed by the mapped options, themed to
 * match the rest of the form fields. Callers fetch their own data and shape
 * it into `options`.
 */
export const EntitySelect = ({
    id,
    value,
    onChange,
    disabled,
    options,
    placeholder
}: EntitySelectProps) => (
    <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`${formFieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
        style={{ ...formFieldStyle, colorScheme: 'dark' }}
    >
        <option style={selectOptionStyle} value=''>
            {placeholder}
        </option>
        {options.map((option) => (
            <option style={selectOptionStyle} key={option.value} value={option.value}>
                {option.indent ? `  └ ${option.label}` : option.label}
            </option>
        ))}
    </select>
);
