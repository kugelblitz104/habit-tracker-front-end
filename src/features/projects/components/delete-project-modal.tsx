import type { ProjectRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { Label } from '@/components/ui/label';
import { Button, CloseButton } from '@headlessui/react';

type DeleteProjectModalProps = {
    isOpen: boolean;
    project: ProjectRead;
    onClose: () => void;
    handleDeleteProject: (project: ProjectRead) => void;
};

/**
 * Themed delete confirmation (BaseModal shell, mirrors DeleteHabitModal). The
 * copy makes the backend contract explicit: deleting a project never deletes
 * its tasks — they are kept and become unassigned.
 */
export const DeleteProjectModal = ({
    isOpen = false,
    project,
    onClose,
    handleDeleteProject
}: DeleteProjectModalProps) => {
    const onSubmit = (data: ProjectRead) => {
        handleDeleteProject(data);
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title='Delete project'>
            <div
                className='rounded-row border px-3 py-2.5'
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)'
                }}
            >
                <Label mainText={project.name} textColor={project.color} />
            </div>
            <div className='space-y-3 font-mono text-[12px] leading-relaxed text-text-muted'>
                <p>
                    This action is{' '}
                    <strong className='font-semibold text-danger'>irreversible</strong>. The project
                    and its notes will be permanently deleted.
                </p>
                <p>
                    Tasks in this project are{' '}
                    <strong className='font-semibold text-text-secondary'>kept</strong> — they
                    simply become unassigned (no project). If you just want it out of the way,
                    consider{' '}
                    <strong className='font-semibold text-text-secondary'>archiving</strong> it
                    instead.
                </p>
            </div>
            <div className='flex justify-end gap-2'>
                <CloseButton className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'>
                    Cancel
                </CloseButton>
                <Button
                    type='submit'
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                    onClick={() => onSubmit(project)}
                >
                    Delete project
                </Button>
            </div>
        </BaseModal>
    );
};
