import type { ProjectRead } from '@/api';
import { ConfirmModal } from '@/components/ui/modals/confirm-modal';
import { Label } from '@/components/ui/label';

type DeleteProjectModalProps = {
    isOpen: boolean;
    project: ProjectRead;
    onClose: () => void;
    handleDeleteProject: (project: ProjectRead) => void;
};

/**
 * Themed delete confirmation on `ConfirmModal`. The copy makes the backend
 * contract explicit: deleting a project never deletes its tasks — they are
 * kept and become unassigned.
 */
export const DeleteProjectModal = ({
    isOpen = false,
    project,
    onClose,
    handleDeleteProject
}: DeleteProjectModalProps) => {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => handleDeleteProject(project)}
            title='Delete project'
            confirmLabel='Delete project'
            danger
            bodyClassName='space-y-3'
            preface={
                <div
                    className='rounded-row border px-3 py-2.5'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: 'var(--surface-input-border)'
                    }}
                >
                    <Label mainText={project.name} textColor={project.color} />
                </div>
            }
        >
            <p>
                This action is <strong className='font-semibold text-danger'>irreversible</strong>.
                The project and its notes will be permanently deleted.
            </p>
            <p>
                Tasks in this project are{' '}
                <strong className='font-semibold text-text-secondary'>kept</strong> — they simply
                become unassigned (no project). If you just want it out of the way, consider{' '}
                <strong className='font-semibold text-text-secondary'>archiving</strong> it instead.
            </p>
        </ConfirmModal>
    );
};
