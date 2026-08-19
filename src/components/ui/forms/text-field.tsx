import { fieldClass, fieldStyle } from '@/components/ui/forms/field-tiers';
import { formLabelClass } from '@/components/ui/forms/form-field-styles';
import { Field, Input, Label } from '@headlessui/react';
import { useFormContext, type RegisterOptions } from 'react-hook-form';

type TextFieldProps = {
    name: string;
    label?: string;
    placeholder?: string;
    isRequired?: boolean;
    isValid?: boolean;
    type?: string;
    validation?: RegisterOptions;
    errorMessage?: string;
};

export const TextField = ({
    name,
    label,
    placeholder = '',
    isRequired = false,
    isValid = true,
    type = 'text',
    validation,
    errorMessage
}: TextFieldProps) => {
    const {
        register,
        formState: { errors }
    } = useFormContext();

    const fieldError = errors[name];

    return (
        <Field className='mb-3'>
            {label && <Label className={formLabelClass}>{label}</Label>}
            <Input
                className={fieldClass('task')}
                style={{
                    ...fieldStyle('task'),
                    borderColor: isValid ? 'var(--surface-input-border)' : 'var(--color-danger)'
                }}
                {...register(name, {
                    required: isRequired ? 'This field is required' : false,
                    ...validation
                })}
                type={type}
                placeholder={placeholder}
                aria-invalid={!isValid}
                aria-describedby={`${name}-error`}
            />
            {fieldError && (
                <span id={`${name}-error`} className='mt-1 block text-[11px] text-red-400'>
                    {(fieldError.message as string) || errorMessage}
                </span>
            )}
        </Field>
    );
};
