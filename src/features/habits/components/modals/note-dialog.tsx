import { ActionButton, ButtonVariant } from '@/components/ui/buttons/action-button';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { sanitizeMultilineText, validationPatterns } from '@/lib/input-sanitization';
import { Field, Label, Textarea } from '@headlessui/react';
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
        <BaseModal
            isOpen={isOpen}
            onClose={() => {
                methods.reset({ note });
                onClose();
            }}
            title={`Note for ${date.toLocaleDateString()}`}
        >
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className='min-w-sm'>
                    <Field className='mb-2'>
                        <Label className='sr-only'>Note</Label>
                        <Textarea
                            {...methods.register('note', validationPatterns.notes)}
                            className={`w-full h-32 p-2 bg-slate-700 border rounded-md resize-none ${
                                errors.note ? 'border-red-500' : 'border-slate-600'
                            }`}
                            placeholder='Enter your note here...'
                            wrap='soft'
                        />
                        {errors.note && (
                            <span className='text-red-400 text-sm mt-1 block'>
                                {errors.note.message as string}
                            </span>
                        )}
                    </Field>
                    <div className='flex gap-2 justify-end'>
                        <ActionButton
                            label='Cancel'
                            onClick={onClose}
                            icon={<X />}
                            variant={ButtonVariant.Primary}
                        />
                        <ActionButton
                            label='Save'
                            onClick={methods.handleSubmit(onSubmit)}
                            icon={<Save />}
                            variant={ButtonVariant.Submit}
                        />
                    </div>
                </form>
            </FormProvider>
        </BaseModal>
    );
};
