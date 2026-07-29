import {
    deleteAllCountdowns,
    deleteAllHabits,
    deleteAllProjects,
    deleteAllTasks,
    deleteAllTimeEntries,
    deleteAllTrackers
} from '@/features/settings/api/bulk-delete';
import { apiErrorMessage } from '@/lib/api-error-message';
import { deleteUser } from '@/features/users/api/delete-users';
import { DeleteUserDataModal } from '@/features/users/components/delete-user-data-modal';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

type DeleteAction = {
    handler: () => void;
    entityName: string;
    entityWarning: string;
};

/** One profile-scoped bulk delete, rendered as a button + confirm-modal copy. */
type ProfileDelete = {
    label: string;
    deleteFn: (profileId: number) => Promise<number>;
    warning: string;
};

const PROFILE_DELETES: ProfileDelete[] = [
    {
        label: 'tasks',
        deleteFn: deleteAllTasks,
        warning:
            'This permanently deletes every task and subtask in this profile. Time ' +
            'entries attached to those tasks are deleted too; linked countdowns are ' +
            'kept but unlinked.'
    },
    {
        label: 'projects',
        deleteFn: deleteAllProjects,
        warning:
            'This permanently deletes every project in this profile. Their tasks are ' +
            'kept and become unassigned.'
    },
    {
        label: 'countdowns',
        deleteFn: deleteAllCountdowns,
        warning: 'This permanently deletes every countdown in this profile.'
    },
    {
        label: 'time entries',
        deleteFn: deleteAllTimeEntries,
        warning:
            'This permanently deletes every time entry in this profile, including any ' +
            'running timer.'
    },
    {
        label: 'habits',
        deleteFn: deleteAllHabits,
        warning:
            'This permanently deletes every habit in this profile, along with all of ' +
            'their tracker history.'
    },
    {
        label: 'trackers',
        deleteFn: deleteAllTrackers,
        warning:
            'This permanently deletes every tracker entry in this profile. The habits ' +
            'themselves are kept.'
    }
];

const outlineDangerButtonClass =
    'rounded-[9px] border px-[15px] py-[9px] text-[13px] transition-colors hover:brightness-110 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

const outlineDangerButtonStyle = {
    color: '#e3b3bd',
    borderColor: 'var(--danger-border)'
} as const;

const scopeLabelClass = 'mb-2 text-[11px] font-semibold uppercase tracking-wide';

/**
 * DANGER ZONE card. Every entity delete is profile-scoped and grouped under
 * "This profile"; deleting the account is the one whole-account action, set
 * apart at the bottom with the solid danger button. Each delete routes through
 * DeleteUserDataModal for confirmation.
 */
export const DangerZoneCard = () => {
    const { user, activeProfile, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<DeleteAction | null>(null);

    const handleDeleteAccount = () => {
        deleteUser(user!.id)
            .then(() => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                toast.error(`Failed to delete account: ${apiErrorMessage(error)}`);
            });
    };

    /**
     * Run a profile-scoped bulk delete, then refresh every cached view. A bulk
     * delete cascades across entities (e.g. deleting habits removes their
     * trackers), so a blanket invalidate is simpler and safer than tracking
     * each affected key.
     */
    const runProfileDelete =
        (label: string, deleteFn: (profileId: number) => Promise<number>) => () => {
            if (!activeProfile) return;
            deleteFn(activeProfile.id)
                .then(async (count) => {
                    toast.success(`Deleted ${count} ${label}`);
                    await queryClient.invalidateQueries();
                })
                .catch((error) => {
                    toast.error(`Failed to delete ${label}: ${apiErrorMessage(error)}`);
                });
        };

    const openDeleteModal = (action: DeleteAction) => {
        setDeleteAction(action);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteAction(null);
    };

    const profileScope = activeProfile ? ` in "${activeProfile.name}"` : '';

    return (
        <SettingsCard
            label='Danger zone'
            labelColor='#d1889a'
            labelGapClass='mb-3.5'
            style={{
                backgroundColor: 'rgba(209,90,110,.05)',
                borderColor: 'rgba(209,90,110,.3)'
            }}
        >
            <div>
                <div className={scopeLabelClass} style={{ color: '#c98a98' }}>
                    This profile{activeProfile ? ` — ${activeProfile.name}` : ''}
                </div>
                <div className='flex flex-wrap gap-2.5'>
                    {PROFILE_DELETES.map(({ label, deleteFn, warning }) => (
                        <button
                            key={label}
                            type='button'
                            disabled={!activeProfile}
                            onClick={() =>
                                openDeleteModal({
                                    handler: runProfileDelete(label, deleteFn),
                                    entityName: `all ${label}${profileScope}`,
                                    entityWarning: warning
                                })
                            }
                            className={outlineDangerButtonClass}
                            style={outlineDangerButtonStyle}
                        >
                            Delete all {label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                className='mt-5 border-t pt-4'
                style={{ borderColor: 'rgba(209,90,110,.2)' }}
            >
                <div className={scopeLabelClass} style={{ color: '#c98a98' }}>
                    Account
                </div>
                <button
                    type='button'
                    onClick={() =>
                        openDeleteModal({
                            handler: handleDeleteAccount,
                            entityName: 'account',
                            entityWarning:
                                'This will permanently delete your account and all associated ' +
                                'data across every profile.'
                        })
                    }
                    className='rounded-[9px] px-[15px] py-[9px] text-[13px] font-semibold transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                >
                    Delete account
                </button>
            </div>

            {deleteAction && (
                <DeleteUserDataModal
                    isOpen={isDeleteModalOpen}
                    onClose={closeDeleteModal}
                    handleDelete={deleteAction.handler}
                    entityName={deleteAction.entityName}
                    entityWarning={deleteAction.entityWarning}
                />
            )}
        </SettingsCard>
    );
};
