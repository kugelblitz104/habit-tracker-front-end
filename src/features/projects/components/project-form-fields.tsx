import { ColorPicker } from '@/components/ui/forms/color-picker';
import { formLabelClass } from '@/components/ui/forms/form-field-styles';
import { TextField } from '@/components/ui/forms/text-field';
import { sanitizeText, validationPatterns } from '@/lib/input-sanitization';
import { isHexColor } from '@/features/projects/utils/project-colors';
import { Field, Fieldset, Label, Textarea } from '@headlessui/react';
import { Controller, useFormContext } from 'react-hook-form';

export type ProjectFormValues = {
    name: string;
    color: string;
    notes: string;
};

type ProjectFormFieldsProps = {
    /** Plain Enter (no shift) in the name field submits, for the quick-add form. */
    onNameEnter?: () => void;
    /** Autofocus the name field, for the quick-add form only. */
    autoFocusName?: boolean;
};

/**
 * The project field block: name, colour, notes. Rendered by both the inline
 * editor and the quick-add expanded form, so the two stay identical. Must sit
 * inside a `FormProvider<ProjectFormValues>`.
 */
export const ProjectFormFields = ({
    onNameEnter,
    autoFocusName = false
}: ProjectFormFieldsProps) => {
    const { control, formState, register } = useFormContext<ProjectFormValues>();
    const errors = formState.errors;
    return (
        <Fieldset>
            <TextField
                isRequired
                label='Project name'
                name='name'
                placeholder='What is this project called?'
                isValid={!errors.name}
                validation={{
                    validate: (value: string) =>
                        sanitizeText(value).length > 0 || 'Project name is required',
                    maxLength: {
                        value: 100,
                        message: 'Project name must be less than 100 characters'
                    }
                }}
                autoFocus={autoFocusName}
                onKeyDown={
                    onNameEnter
                        ? (e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  onNameEnter();
                              }
                          }
                        : undefined
                }
            />
            <Controller
                name='color'
                control={control}
                rules={{
                    validate: (value) =>
                        isHexColor(value) || 'Use a 6-digit hex color, e.g. #e0884a'
                }}
                render={({ field }) => (
                    <>
                        <ColorPicker
                            mode='full'
                            color={field.value}
                            onColorChange={field.onChange}
                        />
                        {errors.color && (
                            <span className='-mt-2 mb-3 block text-[11px] text-red-400'>
                                {errors.color.message as string}
                            </span>
                        )}
                    </>
                )}
            />
            <Field className='mb-3'>
                <Label className={formLabelClass}>Notes</Label>
                <Textarea
                    {...register('notes', validationPatterns.notes)}
                    rows={4}
                    placeholder='Optional project notes…'
                    className='block w-full resize-y rounded-button border px-2.5 py-1.5 font-mono text-[12px] leading-relaxed text-text-secondary outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-now-accent'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: errors.notes
                            ? 'var(--color-danger)'
                            : 'var(--surface-input-border)'
                    }}
                    wrap='soft'
                />
                {errors.notes && (
                    <span className='mt-1 block text-[11px] text-red-400'>
                        {errors.notes.message as string}
                    </span>
                )}
            </Field>
        </Fieldset>
    );
};
