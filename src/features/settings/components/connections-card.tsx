import type { CalendarConnectionRead, ProfileRead } from '@/api';
import { useCreateCalendarConnection } from '@/features/calendar/api/create-calendar-connections';
import { useDeleteCalendarConnection } from '@/features/calendar/api/delete-calendar-connections';
import { useCalendarConnections } from '@/features/calendar/api/get-calendar-connections';
import { useUpdateCalendarConnection } from '@/features/calendar/api/update-calendar-connections';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { EmberToggle } from './ember-toggle';
import {
    SettingsCard,
    settingsGhostBorder,
    settingsGhostButtonClass,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from './settings-card';

const connectionRowStyle = {
    backgroundColor: 'rgba(255,255,255,.02)',
    borderColor: 'rgba(255,255,255,.07)'
} as const;

const DEFAULT_NEW_COLOR = '#6f9fe0';

// Accept webcal:// too (Proton/Apple surface subscription links with that
// pseudo-scheme); it's rewritten to https:// before submit.
const isHttpUrl = (value: string): boolean => /^(https?|webcal):\/\/\S+$/i.test(value.trim());

/** Rewrite webcal:// subscription links to plain https:// (mirrors the backend). */
const normalizeIcsUrl = (value: string): string => {
    const trimmed = value.trim();
    return /^webcal:\/\//i.test(trimmed)
        ? `https://${trimmed.slice('webcal://'.length)}`
        : trimmed;
};

// Mirrors the backend's color validation (`^#[0-9A-Fa-f]{6}$`).
const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);

type ConnectionFormValues = {
    name: string;
    url: string;
    provider: string;
    color: string;
};

type ConnectionFormProps = {
    initial: ConnectionFormValues;
    submitLabel: string;
    pending: boolean;
    onSubmit: (values: ConnectionFormValues) => void;
    onCancel: () => void;
};

/**
 * Inline calendar-connection form shared by "+ Connect a calendar" and the
 * per-row edit affordance. Name + http(s) ICS URL required; provider optional;
 * color via native swatch + hex text input (the full ColorPicker is too large
 * for an inline row).
 */
const ConnectionForm = ({
    initial,
    submitLabel,
    pending,
    onSubmit,
    onCancel
}: ConnectionFormProps) => {
    const [values, setValues] = useState<ConnectionFormValues>(initial);
    const [touched, setTouched] = useState(false);

    const nameValid = values.name.trim().length > 0;
    const urlValid = isHttpUrl(values.url);
    const colorValid = isHexColor(values.color);
    const canSubmit = nameValid && urlValid && colorValid && !pending;

    const set = (patch: Partial<ConnectionFormValues>) =>
        setValues((prev) => ({ ...prev, ...patch }));

    const handleSubmit = () => {
        setTouched(true);
        if (!canSubmit) return;
        onSubmit({
            ...values,
            name: values.name.trim(),
            url: normalizeIcsUrl(values.url),
            provider: values.provider.trim(),
            color: values.color
        });
    };

    return (
        <div
            className='rounded-[10px] border border-dashed p-3.5'
            style={{ borderColor: 'rgba(255,255,255,.12)' }}
        >
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <label>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Name
                    </span>
                    <input
                        type='text'
                        value={values.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder='e.g. Work'
                        autoFocus
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                    {touched && !nameValid && (
                        <span className='mt-1 block text-[11px] text-danger'>
                            Name is required
                        </span>
                    )}
                </label>
                <label>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Provider (optional)
                    </span>
                    <input
                        type='text'
                        value={values.provider}
                        onChange={(e) => set({ provider: e.target.value })}
                        placeholder='e.g. Google'
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                </label>
                <label className='md:col-span-2'>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        ICS URL
                    </span>
                    <input
                        type='text'
                        value={values.url}
                        onChange={(e) => set({ url: e.target.value })}
                        placeholder='https://…/calendar.ics'
                        className={`${settingsInputClass} font-mono text-[12.5px]`}
                        style={settingsInputStyle}
                    />
                    {touched && !urlValid && (
                        <span className='mt-1 block text-[11px] text-danger'>
                            Enter an http(s) or webcal:// URL
                        </span>
                    )}
                </label>
            </div>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
                <span className='flex items-center gap-1.5'>
                    <input
                        type='color'
                        value={values.color}
                        onChange={(e) => set({ color: e.target.value })}
                        aria-label='Calendar color'
                        className='h-[34px] w-[34px] cursor-pointer rounded-[9px] border bg-transparent p-0.5'
                        style={{ borderColor: 'rgba(255,255,255,.1)' }}
                    />
                    <input
                        type='text'
                        value={values.color}
                        onChange={(e) => set({ color: e.target.value })}
                        aria-label='Calendar color hex'
                        className='w-24 rounded-[9px] border px-2.5 py-2 font-mono text-[12px] text-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-now-accent'
                        style={settingsInputStyle}
                    />
                    {touched && !colorValid && (
                        <span className='text-[11px] text-danger'>
                            Use a 6-digit hex color, e.g. #6f9fe0
                        </span>
                    )}
                </span>
                <span className='ml-auto flex items-center gap-1.5'>
                    <button
                        type='button'
                        onClick={handleSubmit}
                        disabled={pending}
                        className={settingsPrimaryButtonClass}
                        style={settingsPrimaryButtonStyle}
                    >
                        {submitLabel}
                    </button>
                    <button
                        type='button'
                        onClick={onCancel}
                        className={settingsGhostButtonClass}
                        style={{ borderColor: settingsGhostBorder }}
                    >
                        Cancel
                    </button>
                </span>
            </div>
        </div>
    );
};

type ConnectionsCardProps = {
    /** Connections are scoped to the SAME profile the preferences card edits. */
    profile: ProfileRead;
};

/**
 * CONNECTIONS card. Two subgroups:
 * - Calendars (read-only, into Today's schedule) for the selected profile:
 *   enable toggle, inline edit, delete-with-confirm, last_error warning line,
 *   and a dashed "+ Connect a calendar" inline create form.
 * - Azure DevOps: STATIC PLACEHOLDER row (no ADO integration exists yet);
 *   rendered exactly per the design with a disabled Manage button.
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

                            {confirmDeleteId === connection.id ? (
                                <span className='flex items-center gap-1.5'>
                                    <span className='font-mono text-[11px] text-text-muted'>
                                        Remove?
                                    </span>
                                    <button
                                        type='button'
                                        onClick={() => deleteConnection.mutate(connection.id)}
                                        disabled={deleteConnection.isPending}
                                        className='rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50'
                                        style={{
                                            backgroundColor: 'var(--color-danger-solid)',
                                            color: 'var(--button-primary-text)'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setConfirmDeleteId(null)}
                                        className={settingsGhostButtonClass}
                                        style={{ borderColor: settingsGhostBorder }}
                                    >
                                        Cancel
                                    </button>
                                </span>
                            ) : (
                                <span className='flex items-center gap-1'>
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
                                </span>
                            )}
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

            <div className='mb-2.5 text-[12px]' style={{ color: '#9a8f81' }}>
                Azure DevOps — publish out
            </div>
            {/*
             * PLACEHOLDER: no Azure DevOps integration exists yet. This static
             * row mirrors the design frame verbatim (blue tint, contoso/Payments,
             * disabled Manage) until a real ADO connection ships.
             */}
            <div
                className='flex items-center gap-3 rounded-[10px] border px-3.5 py-3'
                style={{
                    backgroundColor: 'rgba(74,144,217,.06)',
                    borderColor: 'rgba(74,144,217,.2)'
                }}
            >
                <span
                    className='h-[9px] w-[9px] flex-none rounded-[2px]'
                    style={{ backgroundColor: 'var(--color-azure)' }}
                    aria-hidden='true'
                />
                <div className='min-w-0 flex-1'>
                    <div className='truncate text-[14px] text-text-secondary'>
                        contoso / Payments
                    </div>
                    <div className='mt-0.5 font-mono text-[11px] text-azure-text'>
                        Connected · publishing work items
                    </div>
                </div>
                <button
                    type='button'
                    disabled
                    title='Azure DevOps management is not available yet'
                    className={settingsGhostButtonClass}
                    style={{ borderColor: settingsGhostBorder }}
                >
                    Manage
                </button>
            </div>
        </SettingsCard>
    );
};
