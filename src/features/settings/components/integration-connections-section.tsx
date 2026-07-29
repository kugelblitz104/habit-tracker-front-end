import type { IntegrationConnectionRead, ProfileRead } from '@/api';
import { useCreateIntegrationConnection } from '@/features/integrations/api/create-integration-connection';
import { useDeleteIntegrationConnection } from '@/features/integrations/api/delete-integration-connection';
import { useIntegrationConnections } from '@/features/integrations/api/get-integration-connections';
import { useSyncIntegrationConnection } from '@/features/integrations/api/sync-integration-connection';
import { useUpdateIntegrationConnection } from '@/features/integrations/api/update-integration-connection';
import { apiErrorMessage } from '@/lib/api-error-message';
import { Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
    AddConnectionButton,
    CONNECTION_PIP_CLASS,
    CONNECTION_ROW_CLASS,
    CONNECTION_ROW_STYLE,
    ConnectionLastError,
    ConnectionListState,
    ConnectionRowActions,
    ConnectionsSubtitle
} from './connection-row';
import {
    IntegrationForm,
    type IntegrationFormValues,
    type IntegrationSubmitValues
} from './integration-form';
import { SettingsCard } from './settings-card';

const PROVIDER_LABEL: Record<string, string> = {
    azure_devops: 'Azure DevOps',
    github: 'GitHub'
};

// Provider pip color (github token added to app.css alongside azure).
const providerColor = (provider: string): string =>
    provider === 'github' ? 'var(--color-github)' : 'var(--color-azure)';

const providerSubline = (c: IntegrationConnectionRead): string => {
    if (c.provider === 'azure_devops') {
        const path = [c.organization, c.project].filter(Boolean).join(' / ') || 'Azure DevOps';
        // Show the host for on-prem Azure DevOps Server / TFS so it's clear the
        // connection isn't pointed at the cloud.
        if (c.base_url) {
            const host = c.base_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            return `${path} · ${host}`;
        }
        return path;
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
    baseUrl: '',
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
            base_url: values.base_url ?? null,
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
                base_url: values.base_url ?? null,
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
            <ConnectionsSubtitle profileName={profile.name}>
                Azure DevOps &amp; GitHub — pull your open items in, publish tasks out
            </ConnectionsSubtitle>

            <div className='flex flex-col gap-2'>
                <ConnectionListState
                    isLoading={connectionsQuery.isLoading}
                    isError={connectionsQuery.isError}
                    loadingMessage='Loading connections…'
                    errorMessage='Failed to load connections'
                />

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
                                baseUrl: connection.base_url ?? '',
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
                            className={CONNECTION_ROW_CLASS}
                            style={CONNECTION_ROW_STYLE}
                        >
                            <span
                                className={CONNECTION_PIP_CLASS}
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
                                        ·{' '}
                                        {PROVIDER_LABEL[connection.provider] ?? connection.provider}
                                    </span>
                                </div>
                                <div className='mt-0.5 truncate font-mono text-[11px] text-text-muted'>
                                    {providerSubline(connection)}
                                    {connection.last_synced_at && (
                                        <> · synced {connection.last_synced_at.split('T')[0]}</>
                                    )}
                                </div>
                                <ConnectionLastError message={connection.last_error} />
                            </div>

                            <ConnectionRowActions
                                isConfirming={confirmDeleteId === connection.id}
                                onConfirm={() => deleteConnection.mutate(connection.id)}
                                onCancel={() => setConfirmDeleteId(null)}
                                pending={deleteConnection.isPending}
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
                            </ConnectionRowActions>
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
                    <AddConnectionButton
                        label='Connect a task tracker'
                        onClick={() => setAdding(true)}
                    />
                )}
            </div>

            <p className='mt-3 font-mono text-[11px] text-text-faint'>
                Uses a personal access token you create in Azure DevOps or GitHub — stored
                encrypted, never shown again.
            </p>
        </SettingsCard>
    );
};
