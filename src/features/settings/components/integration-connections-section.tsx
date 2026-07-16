import type { IntegrationConnectionRead, ProfileRead } from '@/api';
import { InlineConfirmAction } from '@/components/ui/inline-confirm-action';
import { useCreateIntegrationConnection } from '@/features/integrations/api/create-integration-connection';
import { useDeleteIntegrationConnection } from '@/features/integrations/api/delete-integration-connection';
import { useIntegrationConnections } from '@/features/integrations/api/get-integration-connections';
import { useSyncIntegrationConnection } from '@/features/integrations/api/sync-integration-connection';
import { useUpdateIntegrationConnection } from '@/features/integrations/api/update-integration-connection';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
    IntegrationForm,
    type IntegrationFormValues,
    type IntegrationSubmitValues
} from './integration-form';
import { SettingsCard } from './settings-card';

const rowStyle = {
    backgroundColor: 'rgba(255,255,255,.02)',
    borderColor: 'rgba(255,255,255,.07)'
} as const;

const PROVIDER_LABEL: Record<string, string> = {
    azure_devops: 'Azure DevOps',
    github: 'GitHub'
};

// Provider pip color (github token added to app.css alongside azure).
const providerColor = (provider: string): string =>
    provider === 'github' ? 'var(--color-github)' : 'var(--color-azure)';

const providerSubline = (c: IntegrationConnectionRead): string => {
    if (c.provider === 'azure_devops') {
        return [c.organization, c.project].filter(Boolean).join(' / ') || 'Azure DevOps';
    }
    return c.default_repo ? `publishes to ${c.default_repo}` : 'issues assigned to you';
};

const EMPTY_FORM: IntegrationFormValues = {
    provider: 'azure_devops',
    name: '',
    token: '',
    organization: '',
    project: '',
    workItemType: '',
    defaultRepo: ''
};

type Props = {
    /** Same profile the rest of the Connections card is scoped to. */
    profile: ProfileRead;
};

/**
 * Azure DevOps / GitHub connections: connect with a PAT, "Sync now" to pull
 * your open assigned items in as tasks, edit/rotate the PAT, or remove. Tasks
 * can also be published out to a connection from the task view.
 */
export const IntegrationConnectionsSection = ({ profile }: Props) => {
    const connectionsQuery = useIntegrationConnections({ profileId: profile.id });
    const connections = connectionsQuery.data?.integration_connections ?? [];

    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    const createConnection = useCreateIntegrationConnection({
        mutationConfig: {
            onSuccess: (c) => {
                toast.success(`${PROVIDER_LABEL[c.provider] ?? 'Integration'} connected`);
                setAdding(false);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to connect'));
            }
        }
    });

    const updateConnection = useUpdateIntegrationConnection({
        mutationConfig: {
            onSuccess: () => {
                toast.success('Connection updated');
                setEditingId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update'));
            }
        }
    });

    const deleteConnection = useDeleteIntegrationConnection({
        mutationConfig: {
            onSuccess: () => {
                toast.success('Connection removed');
                setConfirmDeleteId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to remove'));
                setConfirmDeleteId(null);
            }
        }
    });

    const syncConnection = useSyncIntegrationConnection({
        mutationConfig: {
            onSuccess: (result) => {
                const base = `Imported ${result.tasks_imported}, skipped ${result.tasks_skipped}`;
                const errorCount = result.errors?.length ?? 0;
                if (errorCount > 0) {
                    toast.warning(`${base} · ${errorCount} error(s)`);
                } else {
                    toast.success(base);
                }
                setSyncingId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Sync failed'));
                setSyncingId(null);
            }
        }
    });

    const handleCreate = (values: IntegrationSubmitValues) => {
        createConnection.mutate({
            provider: values.provider,
            name: values.name,
            token: values.token ?? '',
            organization: values.organization ?? null,
            project: values.project ?? null,
            work_item_type: values.work_item_type ?? null,
            default_repo: values.default_repo ?? null,
            profile_id: profile.id
        });
    };

    const handleEdit = (connection: IntegrationConnectionRead, values: IntegrationSubmitValues) => {
        updateConnection.mutate({
            connectionId: connection.id,
            data: {
                name: values.name,
                token: values.token, // omitted when blank -> keeps stored PAT
                organization: values.organization ?? null,
                project: values.project ?? null,
                work_item_type: values.work_item_type ?? null,
                default_repo: values.default_repo ?? null
            }
        });
    };

    const handleSync = (connection: IntegrationConnectionRead) => {
        setSyncingId(connection.id);
        syncConnection.mutate(connection.id);
    };

    return (
        <SettingsCard label='Task trackers'>
            <div className='mb-2.5 text-[12px]' style={{ color: '#9a8f81' }}>
                Azure DevOps &amp; GitHub — pull your open items in, publish tasks out · for{' '}
                <span className='font-semibold text-text-secondary-soft'>{profile.name}</span>
            </div>

            <div className='flex flex-col gap-2'>
                {connectionsQuery.isLoading && (
                    <div className='py-1 font-mono text-[11px] text-text-faint'>
                        Loading connections…
                    </div>
                )}
                {connectionsQuery.isError && (
                    <div className='py-1 font-mono text-[11px] text-danger'>
                        Failed to load connections
                    </div>
                )}

                {connections.map((connection) =>
                    editingId === connection.id ? (
                        <IntegrationForm
                            key={connection.id}
                            isEdit
                            initial={{
                                provider: connection.provider as IntegrationFormValues['provider'],
                                name: connection.name,
                                token: '',
                                organization: connection.organization ?? '',
                                project: connection.project ?? '',
                                workItemType: connection.work_item_type ?? '',
                                defaultRepo: connection.default_repo ?? ''
                            }}
                            submitLabel='Save'
                            pending={updateConnection.isPending}
                            onSubmit={(values) => handleEdit(connection, values)}
                            onCancel={() => setEditingId(null)}
                        />
                    ) : (
                        <div
                            key={connection.id}
                            className='flex items-center gap-3 rounded-[10px] border px-3.5 py-[11px]'
                            style={rowStyle}
                        >
                            <span
                                className='h-[9px] w-[9px] flex-none rounded-[2px]'
                                style={{ backgroundColor: providerColor(connection.provider) }}
                                aria-hidden='true'
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='truncate'>
                                    <span className='text-[14px] text-text-secondary'>
                                        {connection.name}
                                    </span>
                                    <span className='font-mono text-[11px] text-text-muted'>
                                        {' '}
                                        · {PROVIDER_LABEL[connection.provider] ?? connection.provider}
                                    </span>
                                </div>
                                <div className='mt-0.5 truncate font-mono text-[11px] text-text-muted'>
                                    {providerSubline(connection)}
                                    {connection.last_synced_at && (
                                        <> · synced {connection.last_synced_at.split('T')[0]}</>
                                    )}
                                </div>
                                {connection.last_error && (
                                    <div className='mt-1 flex items-center gap-1 font-mono text-[11px] text-danger'>
                                        <TriangleAlert size={11} className='flex-none' />
                                        <span className='truncate'>{connection.last_error}</span>
                                    </div>
                                )}
                            </div>

                            <InlineConfirmAction
                                isConfirming={confirmDeleteId === connection.id}
                                onConfirm={() => deleteConnection.mutate(connection.id)}
                                onCancel={() => setConfirmDeleteId(null)}
                                pending={deleteConnection.isPending}
                                confirmPrompt='Remove?'
                                confirmButtonClassName='py-1'
                                triggerClassName='flex items-center gap-1'
                            >
                                <button
                                    type='button'
                                    onClick={() => handleSync(connection)}
                                    disabled={syncingId === connection.id}
                                    title={`Sync "${connection.name}" now`}
                                    aria-label={`Sync "${connection.name}" now`}
                                    className='flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50'
                                >
                                    <RefreshCw
                                        size={13}
                                        className={
                                            syncingId === connection.id ? 'animate-spin' : undefined
                                        }
                                    />
                                    {syncingId === connection.id ? 'Syncing…' : 'Sync now'}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setEditingId(connection.id)}
                                    title={`Edit "${connection.name}"`}
                                    aria-label={`Edit "${connection.name}"`}
                                    className='rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-text-secondary'
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setConfirmDeleteId(connection.id)}
                                    title={`Remove "${connection.name}"`}
                                    aria-label={`Remove "${connection.name}"`}
                                    className='mr-1 rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-danger'
                                >
                                    <Trash2 size={13} />
                                </button>
                            </InlineConfirmAction>
                        </div>
                    )
                )}

                {adding ? (
                    <IntegrationForm
                        initial={EMPTY_FORM}
                        submitLabel='Connect'
                        pending={createConnection.isPending}
                        onSubmit={handleCreate}
                        onCancel={() => setAdding(false)}
                    />
                ) : (
                    <button
                        type='button'
                        onClick={() => setAdding(true)}
                        className='flex items-center justify-center gap-2 rounded-[10px] border border-dashed p-2.5 text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                        style={{ borderColor: 'rgba(255,255,255,.12)' }}
                    >
                        <Plus size={14} />
                        Connect a task tracker
                    </button>
                )}
            </div>

            <p className='mt-3 font-mono text-[11px] text-text-faint'>
                Uses a personal access token you create in Azure DevOps or GitHub — stored
                encrypted, never shown again.
            </p>
        </SettingsCard>
    );
};
