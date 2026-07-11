import type { UserRead, UserUpdate } from '@/api';
import {
    settingsFieldLabelClass,
    settingsFieldLabelStyle,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from '@/features/settings/components/settings-card';
import {
    sanitizeEmail,
    sanitizeFormData,
    sanitizeText,
    validationPatterns
} from '@/lib/input-sanitization';
import { useForm, type RegisterOptions, type SubmitHandler } from 'react-hook-form';

type UpdateUserFormProps = {
    user: UserRead;
    handleUpdateUser: (user: UserUpdate) => void;
};

interface IUpdateUserFormInput {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

type FieldConfig = {
    name: keyof IUpdateUserFormInput;
    label: string;
    type?: string;
    validation: RegisterOptions<IUpdateUserFormInput, keyof IUpdateUserFormInput>;
};

const FIELDS: FieldConfig[] = [
    { name: 'username', label: 'Username', validation: validationPatterns.username },
    { name: 'email', label: 'Email', type: 'email', validation: validationPatterns.email },
    { name: 'first_name', label: 'First name', validation: validationPatterns.name },
    { name: 'last_name', label: 'Last name', validation: validationPatterns.name }
];

/**
 * Account details form (username / email / first / last in a 2x2 grid) with
 * the ember input + gradient-save treatment. Validation and sanitization are
 * unchanged; saving still logs the user out (handled by the caller's
 * handleUpdateUser) because credentials may have changed.
 *
 * Not rebuilt on `TextField` (components/ui/forms/text-field.tsx): that field
 * uses its own token set (mono uppercase label + `rounded-button`/`--surface-
 * input-*` classes) rather than the settings input tokens used here
 * (`rounded-[9px]` + `rgba(255,255,255,.04)` surface, font-display). Swapping
 * would visibly change this form, so the hand-rolled label+input+error markup
 * stays as-is.
 */
export const UpdateUserForm = ({ user, handleUpdateUser }: UpdateUserFormProps) => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<IUpdateUserFormInput>({
        values: {
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || ''
        }
    });

    const onSubmit: SubmitHandler<IUpdateUserFormInput> = (data) => {
        const sanitizedData = sanitizeFormData(data, {
            username: sanitizeText,
            first_name: sanitizeText,
            last_name: sanitizeText,
            email: sanitizeEmail
        });

        handleUpdateUser({
            username: sanitizedData.username,
            first_name: sanitizedData.first_name,
            last_name: sanitizedData.last_name,
            email: sanitizedData.email
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className='mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2'>
                {FIELDS.map((field) => {
                    const fieldError = errors[field.name];
                    return (
                        <div key={field.name}>
                            <label
                                htmlFor={`account-${field.name}`}
                                className={settingsFieldLabelClass}
                                style={settingsFieldLabelStyle}
                            >
                                {field.label}
                            </label>
                            <input
                                id={`account-${field.name}`}
                                type={field.type ?? 'text'}
                                className={settingsInputClass}
                                style={{
                                    ...settingsInputStyle,
                                    ...(fieldError
                                        ? { borderColor: 'var(--color-danger)' }
                                        : undefined)
                                }}
                                aria-invalid={!!fieldError}
                                aria-describedby={`account-${field.name}-error`}
                                {...register(field.name, field.validation)}
                            />
                            {fieldError && (
                                <span
                                    id={`account-${field.name}-error`}
                                    className='mt-1 block text-[11px] text-danger'
                                >
                                    {fieldError.message}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <button
                type='submit'
                className={settingsPrimaryButtonClass}
                style={settingsPrimaryButtonStyle}
            >
                Save changes
            </button>
        </form>
    );
};
