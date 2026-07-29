import type { CalendarConnectionRead, ProfileRead } from '@/api';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import { useCreateCalendarConnection } from '@/features/calendar/api/create-calendar-connections';
import { useDeleteCalendarConnection } from '@/features/calendar/api/delete-calendar-connections';
import { useCalendarConnections } from '@/features/calendar/api/get-calendar-connections';
import { useUpdateCalendarConnection } from '@/features/calendar/api/update-calendar-connections';
import { apiErrorMessage } from '@/lib/api-error-message';
import { Pencil, Trash2 } from 'lucide-react';
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
import { ConnectionForm, type ConnectionFormValues } from './connection-form';
import { SettingsCard } from './settings-card';

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
            <ConnectionsSubtitle profileName={profile.name}>
                Calendars — read-only, into Today's schedule
            </ConnectionsSubtitle>

            <div className='mb-4 flex flex-col gap-2'>
                <ConnectionListState
                    isLoading={connectionsQuery.isLoading}
                    isError={connectionsQuery.isError}
                    loadingMessage='Loading calendars…'
                    errorMessage='Failed to load calendars'
                />

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
                            className={CONNECTION_ROW_CLASS}
                            style={CONNECTION_ROW_STYLE}
                        >
                            <span
                                className={CONNECTION_PIP_CLASS}
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
                            </ConnectionRowActions>
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
                    <AddConnectionButton
                        label='Connect a calendar'
                        onClick={() => setAdding(true)}
                    />
                )}
            </div>
        </SettingsCard>
    );
};
