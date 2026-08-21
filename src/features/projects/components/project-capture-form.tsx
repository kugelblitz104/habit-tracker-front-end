import type { ProjectCreate } from '@/api';
import { CaptureFormCard } from '@/components/ui/forms/capture-form-card';
import { sanitizeFormData, sanitizeMultilineText, sanitizeText } from '@/lib/input-sanitization';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCreateProject } from '../api/create-projects';
import { randomProjectColor } from '../utils/project-colors';
import { ProjectFormFields, type ProjectFormValues } from './project-form-fields';

type ProjectCaptureFormProps = {
    profileId: number;
    /** Name carried over from the capture bar. */
    initialName: string;
    onClose: () => void;
};

/**
 * Expanded quick-add form for a project, opened by Shift+Enter or the + button
 * in the capture bar. Sits inline where the bar was and renders the same fields
 * as `ProjectEditor`. The bar's own Enter path still creates a project from a
 * name and a palette colour; this is the path that sets the rest up front.
 */
export const ProjectCaptureForm = ({
    profileId,
    initialName,
    onClose
}: ProjectCaptureFormProps) => {
    const createProject = useCreateProject();
    // Matches the capture bar's own quick-create default. Lazy so it picks one
    // color at mount rather than re-rolling on every render.
    const [defaultColor] = useState(randomProjectColor);
    const methods = useForm<ProjectFormValues>({
        defaultValues: {
            name: initialName,
            color: defaultColor,
            notes: ''
        }
    });

    const name = methods.watch('name');
    const canSubmit = name.trim().length > 0 && !createProject.isPending;

    const onValid: SubmitHandler<ProjectFormValues> = (data) => {
        const clean = sanitizeFormData(data, {
            name: sanitizeText,
            notes: sanitizeMultilineText
        });

        // `archived` exists on ProjectCreate but is deliberately not sent.
        const payload: ProjectCreate = {
            profile_id: profileId,
            name: clean.name,
            color: clean.color,
            notes: clean.notes
        };

        createProject.mutate(payload, {
            onSuccess: () => {
                toast.success('Project created');
                onClose();
            },
            // Keep the form open with the drafted fields intact on failure.
            onError: () => toast.error('Failed to create project. Please try again.')
        });
    };

    const submit = () => void methods.handleSubmit(onValid)();

    return (
        <FormProvider {...methods}>
            <CaptureFormCard
                onCancel={onClose}
                onSubmit={submit}
                canSubmit={canSubmit}
                isPending={createProject.isPending}
                submitLabel='Add project'
                pendingLabel='Adding…'
            >
                <ProjectFormFields onNameEnter={submit} autoFocusName />
            </CaptureFormCard>
        </FormProvider>
    );
};
