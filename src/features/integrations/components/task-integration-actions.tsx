import type { TaskRead } from '@/api';
import { useIntegrationConnections } from '@/features/integrations/api/get-integration-connections';
import { usePublishTask } from '@/features/integrations/api/publish-task';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { Link2, Send, Unlink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';

const PROVIDER_LABEL: Record<string, string> = {
    azure_devops: 'Azure DevOps',
    github: 'GitHub'
};

// Infer the provider from a pasted work-item/issue URL, so a manual link gets
// the right chip color. Null when it doesn't look like either host.
const sourceFromUrl = (url: string): string | null => {
    if (/dev\.azure\.com|\.visualstudio\.com/i.test(url)) return 'azure_devops';
    if (/github\.com/i.test(url)) return 'github';
    return null;
};

type Props = {
    task: TaskRead;
};

/**
 * Task-detail integration controls: publish an unlinked task out to a connected
 * Azure DevOps / GitHub as a new work item / issue, or manually link it to an
 * existing item by URL. When already linked, shows the link with an Unlink
 * action. Purely a one-time link — the task's later state is never pushed.
 */
export const TaskIntegrationActions = ({ task }: Props) => {
    const connectionsQuery = useIntegrationConnections({ profileId: task.profile_id });
    const connections = connectionsQuery.data?.integration_connections ?? [];

    const [linking, setLinking] = useState(false);
    const [ref, setRef] = useState('');
    const [url, setUrl] = useState('');
    const [publishingId, setPublishingId] = useState<number | null>(null);

    const publish = usePublishTask({
        mutationConfig: {
            onSuccess: (result) => {
                toast.success(`Published as ${result.external_ref}`);
                setPublishingId(null);
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to publish'));
                setPublishingId(null);
            }
        }
    });

    const updateTask = useUpdateTask({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update link'));
            }
        }
    });

    const isLinked = !!(task.external_ref && task.external_url);

    const handlePublish = (connectionId: number) => {
        setPublishingId(connectionId);
        publish.mutate({ connectionId, taskId: task.id });
    };

    const handleLink = () => {
        if (!ref.trim() || !url.trim()) return;
        updateTask.mutate(
            {
                taskId: task.id,
                data: {
                    source: sourceFromUrl(url),
                    external_ref: ref.trim(),
                    external_url: url.trim()
                }
            },
            {
                onSuccess: () => {
                    toast.success('Task linked');
                    setLinking(false);
                    setRef('');
                    setUrl('');
                }
            }
        );
    };

    const handleUnlink = () => {
        updateTask.mutate(
            {
                taskId: task.id,
                data: { source: null, external_ref: null, external_url: null }
            },
            { onSuccess: () => toast.success('Task unlinked') }
        );
    };

    return (
        <div>
            <h3 className='mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                Integrations
            </h3>

            {isLinked ? (
                <div className='flex items-center gap-2'>
                    <a
                        href={task.external_url!}
                        target='_blank'
                        rel='noreferrer'
                        className='min-w-0 truncate font-mono text-[12px]'
                        style={{
                            color:
                                task.source === 'github'
                                    ? 'var(--color-github-text)'
                                    : 'var(--color-azure-text)'
                        }}
                    >
                        {task.external_ref} ↗
                    </a>
                    <button
                        type='button'
                        onClick={handleUnlink}
                        disabled={updateTask.isPending}
                        className='ml-auto inline-flex items-center gap-1 rounded-button border px-2 py-1 font-mono text-[11px] text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50'
                        style={{ borderColor: 'rgba(255,255,255,.12)' }}
                    >
                        <Unlink size={12} />
                        Unlink
                    </button>
                </div>
            ) : connections.length === 0 ? (
                <p className='font-mono text-[11.5px] text-text-faint'>
                    Connect Azure DevOps or GitHub in Settings to publish or link this task.
                </p>
            ) : (
                <div className='flex flex-col gap-2'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                        {connections.map((c) => (
                            <button
                                key={c.id}
                                type='button'
                                onClick={() => handlePublish(c.id)}
                                disabled={publishingId === c.id}
                                title={`Create a new item in ${c.name}`}
                                className='inline-flex items-center gap-1 rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50'
                                style={{ borderColor: 'rgba(255,255,255,.12)' }}
                            >
                                <Send size={12} />
                                {publishingId === c.id
                                    ? 'Publishing…'
                                    : `Publish to ${PROVIDER_LABEL[c.provider] ?? c.name}`}
                            </button>
                        ))}
                        {!linking && (
                            <button
                                type='button'
                                onClick={() => setLinking(true)}
                                className='inline-flex items-center gap-1 rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-muted transition-colors hover:text-text-secondary'
                                style={{ borderColor: 'rgba(255,255,255,.12)' }}
                            >
                                <Link2 size={12} />
                                Link existing
                            </button>
                        )}
                    </div>

                    {linking && (
                        <div
                            className='flex flex-col gap-2 rounded-[10px] border border-dashed p-3'
                            style={{ borderColor: 'rgba(255,255,255,.12)' }}
                        >
                            <input
                                type='text'
                                value={ref}
                                onChange={(e) => setRef(e.target.value)}
                                placeholder='Reference, e.g. AB#2841 or owner/repo#42'
                                className='w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none'
                                style={{
                                    backgroundColor: 'var(--surface-input-bg)',
                                    borderColor: 'var(--surface-input-border)'
                                }}
                            />
                            <input
                                type='text'
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder='https://… link to the work item / issue'
                                className='w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none'
                                style={{
                                    backgroundColor: 'var(--surface-input-bg)',
                                    borderColor: 'var(--surface-input-border)'
                                }}
                            />
                            <div className='flex items-center justify-end gap-1.5'>
                                <button
                                    type='button'
                                    onClick={handleLink}
                                    disabled={!ref.trim() || !url.trim() || updateTask.isPending}
                                    className='rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50'
                                    style={{ borderColor: 'rgba(255,255,255,.14)' }}
                                >
                                    Link
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setLinking(false)}
                                    className='rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-muted transition-colors hover:text-text-secondary'
                                    style={{ borderColor: 'rgba(255,255,255,.12)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
