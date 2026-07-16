import type { CalendarConnectionRead, ProfileRead } from '@/api';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import { InlineConfirmAction } from '@/components/ui/inline-confirm-action';
import { useCreateCalendarConnection } from '@/features/calendar/api/create-calendar-connections';
import { useDeleteCalendarConnection } from '@/features/calendar/api/delete-calendar-connections';
import { useCalendarConnections } from '@/features/calendar/api/get-calendar-connections';
import { useUpdateCalendarConnection } from '@/features/calendar/api/update-calendar-connections';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { ConnectionForm, type ConnectionFormValues } from './connection-form';
import { SettingsCard } from './settings-card';

const connectionRowStyle = {
    backgroundColor: 'rgba(255,255,255,.02)',
    borderColor: 'rgba(255,255,255,.07)'
} as const;

const DEFAULT_NEW_COLOR = '#6f9fe0';

type ConnectionsCardProps = {
    /** Connections are scoped to the SAME profile the preferences card edits. */
    profile: ProfileRead;
};

/**
 * CONNECTIONS card: read-only calendar subscriptions (into Today's schedule)
 * for the selected profile — enable toggle, inline edit, delete-with-confirm,
 * last_error warning line, and a dashed "+ Connect a calendar" inline create
 * form. Task-tracker integrations (Azure DevOps / GitHub) live in their own
 * card, IntegrationConnectionsSection.
 */
export const ConnectionsCard = ({ profile }: ConnectionsCardProps) => {
    const connectionsQuery = useCalendarConnections({ profileId: profile.id });
    const connections = connectionsQuery.data?.calendar_connections ?? [];

    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const createConnection = useCreateCalendarConnection({
        mutationConfig: {
            onSuccess: (connection) => {
                toast.success(`Calendar "${connection.name}" connected`);
                setAdding(false);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to connect calendar'));
            }
        }
    });

    const updateConnection = useUpdateCalendarConnection({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update calendar'));
            }
        }
    });

    const deleteConnection = useDeleteCalendarConnection({
        mutationConfig: {
            onSuccess: () => {
                toast.success('Calendar removed');
                setConfirmDeleteId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to remove calendar'));
                setConfirmDeleteId(null);
            }
        }
    });

    const handleToggle = (connection: CalendarConnectionRead, enabled: boolean) => {
        updateConnection.mutate(
            { connectionId: connection.id, data: { enabled } },
            {
                onSuccess: () =>
                    toast.success(`${connection.name} ${enabled ? 'enabled' : 'disabled'}`)
            }
        );
    };

    const handleEditSubmit = (connection: CalendarConnectionRead, values: ConnectionFormValues) => {
        updateConnection.mutate(
            {
                connectionId: connection.id,
                data: {
                    name: values.name,
                    url: values.url,
                    color: values.color,
                    provider: values.provider || null
                }
            },
            {
                onSuccess: () => {
                    toast.success(`Calendar "${values.name}" updated`);
                    setEditingId(null);
                }
            }
        );
    };

    return (
        <SettingsCard label='Connections'>
            <div className='mb-2.5 text-[12px]' style={{ color: '#9a8f81' }}>
                Calendars — read-only, into Today's schedule · for{' '}
                <span className='font-semibold text-text-secondary-soft'>{profile.name}</span>
            </div>

            <div className='mb-4 flex flex-col gap-2'>
                {connectionsQuery.isLoading && (
                    <div className='py-1 font-mono text-[11px] text-text-faint'>
                        Loading calendars…
                    </div>
                )}
                {connectionsQuery.isError && (
                    <div className='py-1 font-mono text-[11px] text-danger'>
                        Failed to load calendars
                    </div>
                )}

                {connections.map((connection) =>
                    editingId === connection.id ? (
                        <ConnectionForm
                            key={connection.id}
                            initial={{
                                name: connection.name,
                                url: connection.url,
                                provider: connection.provider ?? '',
                                color: connection.color
                            }}
                            submitLabel='Save'
                            pending={updateConnection.isPending}
                            onSubmit={(values) => handleEditSubmit(connection, values)}
                            onCancel={() => setEditingId(null)}
                        />
                    ) : (
                        <div
                            key={connection.id}
                            className='flex items-center gap-3 rounded-[10px] border px-3.5 py-[11px]'
                            style={connectionRowStyle}
                        >
                            <span
                                className='h-[9px] w-[9px] flex-none rounded-[3px]'
                                style={{ backgroundColor: connection.color }}
                                aria-hidden='true'
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='truncate'>
                                    <span className='text-[14px] text-text-secondary'>
                                        {connection.name}
                                    </span>
                                    {connection.provider && (
                                        <span className='font-mono text-[11px] text-text-muted'>
                                            {' '}
                                            · {connection.provider}
                                        </span>
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
                                    onClick={() => setEditingId(connection.id)}
                                    title={`Edit "${connection.name}"`}
                                    aria-label={`Edit calendar "${connection.name}"`}
                                    className='rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-text-secondary'
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setConfirmDeleteId(connection.id)}
                                    title={`Remove "${connection.name}"`}
                                    aria-label={`Remove calendar "${connection.name}"`}
                                    className='mr-1 rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-danger'
                                >
                                    <Trash2 size={13} />
                                </button>
                                <EmberToggle
                                    checked={!!connection.enabled}
                                    onChange={(value) => handleToggle(connection, value)}
                                    label={`${connection.name} enabled`}
                                    size='sm'
                                    disabled={updateConnection.isPending}
                                />
                            </InlineConfirmAction>
                        </div>
                    )
                )}

                {adding ? (
                    <ConnectionForm
                        initial={{
                            name: '',
                            url: '',
                            provider: '',
                            color: DEFAULT_NEW_COLOR
                        }}
                        submitLabel='Connect'
                        pending={createConnection.isPending}
                        onSubmit={(values) =>
                            createConnection.mutate({
                                name: values.name,
                                url: values.url,
                                color: values.color,
                                provider: values.provider || null,
                                profile_id: profile.id
                            })
                        }
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
                        Connect a calendar
                    </button>
                )}
            </div>
        </SettingsCard>
    );
};
