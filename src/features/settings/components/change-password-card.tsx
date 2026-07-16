import {
    settingsFieldLabelClass,
    settingsFieldLabelStyle,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from '@/features/settings/components/settings-card';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { updateUser } from '@/features/users/api/update-users';
import { useAuth } from '@/lib/auth-context';
import { validationPatterns } from '@/lib/input-sanitization';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

interface IChangePasswordInput {
    password: string;
    confirmPassword: string;
}

/**
 * PASSWORD card: an authenticated in-app password change for a signed-in user
 * (distinct from the logged-out /forgot-password email flow). Reuses the
 * existing PATCH /users/{id} `plaintext_password` support — no dedicated
 * endpoint needed. Like the Account card, a successful change signs the user
 * out so they re-authenticate with the new password.
 */
export const ChangePasswordCard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        getValues,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<IChangePasswordInput>();

    const onSubmit: SubmitHandler<IChangePasswordInput> = async (data) => {
        if (!user) return;
        try {
            await updateUser(user.id, { plaintext_password: data.password.trim() });
            reset();
            toast.success('Password changed. Please sign in again.');
            logout();
            navigate('/login');
        } catch (error) {
            toast.error(`Failed to change password: ${apiErrorMessage(error)}`);
        }
    };

    if (!user) return null;

    const fields = [
        {
            name: 'password' as const,
            label: 'New password',
            validation: validationPatterns.password,
            error: errors.password
        },
        {
            name: 'confirmPassword' as const,
            label: 'Confirm password',
            validation: {
                validate: (value: string) =>
                    value === getValues('password') || 'Passwords do not match'
            },
            error: errors.confirmPassword
        }
    ];

    return (
        <SettingsCard label='Password' labelGapClass='mb-4'>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className='mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2'>
                    {fields.map((field) => (
                        <div key={field.name}>
                            <label
                                htmlFor={`password-${field.name}`}
                                className={settingsFieldLabelClass}
                                style={settingsFieldLabelStyle}
                            >
                                {field.label}
                            </label>
                            <input
                                id={`password-${field.name}`}
                                type='password'
                                autoComplete='new-password'
                                className={settingsInputClass}
                                style={{
                                    ...settingsInputStyle,
                                    ...(field.error
                                        ? { borderColor: 'var(--color-danger)' }
                                        : undefined)
                                }}
                                aria-invalid={!!field.error}
                                aria-describedby={`password-${field.name}-error`}
                                {...register(field.name, field.validation)}
                            />
                            {field.error && (
                                <span
                                    id={`password-${field.name}-error`}
                                    className='mt-1 block text-[11px] text-danger'
                                >
                                    {field.error.message}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type='submit'
                    disabled={isSubmitting}
                    className={settingsPrimaryButtonClass}
                    style={settingsPrimaryButtonStyle}
                >
                    {isSubmitting ? 'Changing...' : 'Change password'}
                </button>
            </form>
            <p className='mt-3 font-mono text-[11px] text-text-faint'>
                Changing your password signs you out so you can log back in with it.
            </p>
        </SettingsCard>
    );
};
