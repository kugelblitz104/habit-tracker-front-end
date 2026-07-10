import type { ProjectRead, ProjectUpdate } from '@/api';
import { ColorPicker } from '@/components/ui/forms/color-picker';
import { TextField } from '@/components/ui/forms/text-field';
import {
    sanitizeFormData,
    sanitizeMultilineText,
    sanitizeText,
    validationPatterns
} from '@/lib/input-sanitization';
import { useRecentColors } from '@/lib/use-recent-colors';
import { isHexColor } from '@/features/projects/utils/project-colors';
import { Field, Fieldset, Label, Textarea } from '@headlessui/react';
import { Trash2, X } from 'lucide-react';
import { Controller, FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type ProjectEditorProps = {
    project: ProjectRead;
    /** Persist the merged project update (wired to the updateProject mutation). */
    onSave: (payload: ProjectUpdate) => void | Promise<unknown>;
    /** Leave edit mode without saving. */
    onCancel: () => void;
    /** Open the delete confirmation (mirrors the habit editor's in-form Delete). */
    onDelete?: () => void;
    /** Reflects the parent mutation's pending state. */
    isSaving?: boolean;
};

interface IProjectEditorFormInput {
    name: string;
    color: string;
    notes: string;
}

/**
 * Inline project editor rendered in place of the project read-view, mirroring
 * the habit editor's inline pattern (mono micro-label header + X, card surface,
 * shared TextField/ColorPicker primitives, Delete left / Cancel-Save right).
 */
export const ProjectEditor = ({
    project,
    onSave,
    onCancel,
    onDelete,
    isSaving = false
}: ProjectEditorProps) => {
    const { addRecentColor } = useRecentColors();
    const methods = useForm<IProjectEditorFormInput>({
        values: {
            name: project.name,
            color: project.color,
            notes: project.notes ?? ''
        }
    });
    const errors = methods.formState.errors;

    const onSubmit: SubmitHandler<IProjectEditorFormInput> = (data) => {
        const sanitized = sanitizeFormData(data, {
            name: sanitizeText,
            notes: sanitizeMultilineText
        });

        if (data.color.toLowerCase() !== project.color.toLowerCase()) addRecentColor(data.color);

        onSave({
            name: sanitized.name,
            color: sanitized.color,
            notes: sanitized.notes ? sanitized.notes : null
        });
    };

    return (
        <div className='flex flex-col'>
            {/* Header row OUTSIDE the card (mirrors HabitEditor): mono uppercase
                micro-label + an X that bails out without saving. */}
            <div className='mb-1 flex items-center justify-between'>
                <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    Edit project
                </h2>
                <button
                    type='button'
                    onClick={onCancel}
                    aria-label='Close editor'
                    className='rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
                >
                    <X size={16} />
                </button>
            </div>
            <div
                className='flex flex-col gap-3 rounded-card border p-5'
                style={{
                    backgroundColor: 'var(--surface-card-bg)',
                    borderColor: 'var(--surface-card-border)'
                }}
            >
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <Fieldset>
                            <TextField
                                isRequired
                                label='Project name'
                                name='name'
                                placeholder='What is this project called?'
                                isValid={!errors.name}
                                validation={{
                                    validate: (value: string) =>
                                        sanitizeText(value).length > 0 ||
                                        'Project name is required',
                                    maxLength: {
                                        value: 100,
                                        message: 'Project name must be less than 100 characters'
                                    }
                                }}
                            />
                            <Controller
                                name='color'
                                control={methods.control}
                                rules={{
                                    validate: (value) =>
                                        isHexColor(value) || 'Use a 6-digit hex color, e.g. #e0884a'
                                }}
                                render={({ field }) => (
                                    <>
                                        <ColorPicker
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
                                <Label className='mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint'>
                                    Notes
                                </Label>
                                <Textarea
                                    {...methods.register('notes', validationPatterns.notes)}
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
                        {/* Footer: destructive Delete on the left (mirrors the habit
                            editor), Cancel / Save on the right. */}
                        <div className='mt-3 flex items-center justify-between gap-2'>
                            {onDelete ? (
                                <button
                                    type='button'
                                    onClick={onDelete}
                                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125'
                                    style={{
                                        borderColor: 'var(--danger-border)',
                                        color: 'var(--color-danger)'
                                    }}
                                >
                                    <Trash2 size={13} />
                                    Delete project
                                </button>
                            ) : (
                                <span />
                            )}
                            <div className='flex items-center gap-2'>
                                <button
                                    type='button'
                                    onClick={onCancel}
                                    className='rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors hover:text-text-secondary'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    disabled={isSaving}
                                    className='rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                                    style={{
                                        background: 'var(--button-primary-gradient)',
                                        color: 'var(--button-primary-text)'
                                    }}
                                >
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};
