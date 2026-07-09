import { sanitizeMultilineText, validationPatterns } from '@/lib/input-sanitization';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
    Field,
    Label,
    Textarea
} from '@headlessui/react';
import { Save, X } from 'lucide-react';
import { useEffect } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type NoteDialogProps = {
    isOpen: boolean;
    date: Date;
    note: string;
    onClose: () => void;
    onSave: (note: string) => void;
};

interface INoteFormInput {
    note: string;
}

export const NoteDialog = ({ isOpen, date, note, onClose, onSave }: NoteDialogProps) => {
    const methods = useForm<INoteFormInput>({
        values: {
            note: note
        }
    });

    const errors = methods.formState.errors;

    useEffect(() => {
        methods.reset({ note });
    }, [methods.reset, note]);

    const onSubmit: SubmitHandler<INoteFormInput> = (data) => {
        const sanitizedNote = sanitizeMultilineText(data.note);
        onSave(sanitizedNote);
        methods.reset({ note });
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            onClose={() => {
                methods.reset({ note });
                onClose();
            }}
            transition
            className='relative z-50 transition-opacity duration-300 ease-out data-closed:opacity-0'
        >
            <DialogBackdrop className='fixed inset-0 bg-black/60' />
            <div className='fixed inset-0 flex items-center justify-center p-4'>
                <DialogPanel
                    className='w-full max-w-md space-y-4 overflow-y-auto rounded-card border p-5 shadow-popover'
                    style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <DialogTitle className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                        Note for {date.toLocaleDateString()}
                    </DialogTitle>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <Field className='mb-3'>
                                <Label className='sr-only'>Note</Label>
                                <Textarea
                                    {...methods.register('note', validationPatterns.notes)}
                                    className='h-32 w-full resize-none rounded-button border p-2.5 font-mono text-[12px] text-text-secondary outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-[var(--color-habit-accent)]'
                                    style={{
                                        backgroundColor: 'var(--surface-input-bg)',
                                        borderColor: errors.note
                                            ? 'var(--color-danger)'
                                            : 'var(--surface-input-border)'
                                    }}
                                    placeholder='Enter your note here...'
                                    wrap='soft'
                                />
                                {errors.note && (
                                    <span className='mt-1 block font-mono text-[11px] text-danger'>
                                        {errors.note.message as string}
                                    </span>
                                )}
                            </Field>
                            <div className='flex justify-end gap-2'>
                                <button
                                    type='button'
                                    onClick={onClose}
                                    className='inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 font-mono text-[11.5px] text-text-muted transition-colors hover:text-text-secondary'
                                >
                                    <X size={13} />
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    onClick={methods.handleSubmit(onSubmit)}
                                    className='inline-flex items-center gap-1.5 rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold transition-opacity hover:opacity-90'
                                    style={{
                                        backgroundColor: 'var(--color-habit-accent)',
                                        color: 'var(--bg)'
                                    }}
                                >
                                    <Save size={13} />
                                    Save
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </DialogPanel>
            </div>
        </Dialog>
    );
};
