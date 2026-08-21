import type { ProjectRead, ProjectUpdate } from '@/api';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { sanitizeFormData, sanitizeMultilineText, sanitizeText } from '@/lib/input-sanitization';
import { useRecentColors } from '@/lib/use-recent-colors';
import { Trash2, X } from 'lucide-react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { ProjectFormFields, type ProjectFormValues } from './project-form-fields';

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
    const methods = useForm<ProjectFormValues>({
        values: {
            name: project.name,
            color: project.color,
            notes: project.notes ?? ''
        }
    });

    const onSubmit: SubmitHandler<ProjectFormValues> = (data) => {
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
                    className='min-h-[24px] min-w-[24px] rounded-full p-1 text-text-faint transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] hover:text-text-secondary'
                >
                    <X size={16} />
                </button>
            </div>
            <div className='flex flex-col gap-3 rounded-card border p-5' style={CARD_SURFACE_STYLE}>
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <ProjectFormFields />
                        {/* Footer: destructive Delete on the left (mirrors the habit
                            editor), Cancel / Save on the right. */}
                        <div className='mt-3 flex items-center justify-between gap-2'>
                            {onDelete ? (
                                <button
                                    type='button'
                                    onClick={onDelete}
                                    className='inline-flex min-h-[28px] items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors pointer-coarse:min-h-[44px] hover:brightness-125'
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
                                    className='min-h-[28px] rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors pointer-coarse:min-h-[44px] hover:text-text-secondary'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    disabled={isSaving}
                                    className='min-h-[28px] rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity pointer-coarse:min-h-[44px] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
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
