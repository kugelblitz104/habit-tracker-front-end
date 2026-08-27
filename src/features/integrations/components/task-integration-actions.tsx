import type { TaskRead } from '@/api';
import { useIntegrationConnections } from '@/features/integrations/api/get-integration-connections';
import { usePublishTask } from '@/features/integrations/api/publish-task';
import { apiErrorMessage } from '@/lib/api-error-message';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { externalLinkChipStyle, linkSourcePatch, sourceFromUrl } from '@/lib/external-link';
import { ExternalLink, Link2, Pencil, Send, Unlink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { TaskLinkForm } from './task-link-form';

const PROVIDER_LABEL: Record<string, string> = {
    azure_devops: 'Azure DevOps',
    github: 'GitHub'
};

const LINKED_ACTION_CLASS =
    'inline-flex items-center gap-1 rounded-button border px-2 py-1 font-mono text-[11px] text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50';

type Props = {
    task: TaskRead;
};

/**
 * Task-detail link controls: point a task at an existing external work item by
 * URL, and (when the profile has an Azure DevOps / GitHub connection) publish it
 * out as a new work item / issue. When already linked, shows the link with Edit
 * and Unlink actions; Edit reopens this same form pre-filled, so fixing a
 * reference or a moved URL is not an unlink-and-retype. Purely a one-time link;
 * the task's later state is never pushed.
 *
 * Linking needs no connection. It writes the API's source/external_ref/
 * external_url triple through a plain task update, so an item in any tracker can
 * be linked. A connection only buys the Publish direction.
 */
export const TaskIntegrationActions = ({ task }: Props) => {
    const connectionsQuery = useIntegrationConnections({ profileId: task.profile_id });
    const connections = connectionsQuery.data?.integration_connections ?? [];

    const [linking, setLinking] = useState(false);
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

    const handleLink = ({ ref, url }: { ref: string; url: string }) => {
        updateTask.mutate(
            {
                taskId: task.id,
                data: {
                    source: sourceFromUrl(url),
                    external_ref: ref,
                    external_url: url
                }
            },
            {
                onSuccess: () => {
                    toast.success('Task linked');
                    setLinking(false);
                }
            }
        );
    };

    // handleLink and handleEditSave look mergeable but are not: create must
    // re-infer `source` unconditionally, while edit must preserve a `source`
    // the stored URL cannot explain. A half-linked task (source set,
    // external_ref/external_url null - isLinked false) takes the create path,
    // so if that path used edit's rule it would omit source and leave a stale
    // provider on what is, from the user's side, a brand-new link.
    const handleEditSave = ({ ref, url }: { ref: string; url: string }) => {
        updateTask.mutate(
            {
                taskId: task.id,
                data: {
                    // Omits `source` when the stored value was not inferred from
                    // the stored URL, so a published on-prem link keeps its provider.
                    ...linkSourcePatch({ source: task.source, url: task.external_url }, url),
                    external_ref: ref,
                    external_url: url
                }
            },
            {
                onSuccess: () => {
                    toast.success('Link updated');
                    setLinking(false);
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
                Link
            </h3>

            {isLinked ? (
                linking ? (
                    <TaskLinkForm
                        mode='edit'
                        initialRef={task.external_ref ?? ''}
                        initialUrl={task.external_url ?? ''}
                        isPending={updateTask.isPending}
                        onCancel={() => setLinking(false)}
                        onSubmit={handleEditSave}
                    />
                ) : (
                    <div className='flex items-center gap-2'>
                        <a
                            href={task.external_url!}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex min-w-0 items-center gap-1 font-mono text-[12px]'
                            style={{ color: externalLinkChipStyle(task.source).color }}
                        >
                            <span className='truncate'>{task.external_ref}</span>
                            <ExternalLink size={11} className='shrink-0' aria-hidden='true' />
                        </a>
                        <button
                            type='button'
                            onClick={() => setLinking(true)}
                            disabled={updateTask.isPending}
                            aria-label='Edit link'
                            className={`ml-auto ${LINKED_ACTION_CLASS}`}
                            style={{ borderColor: 'rgba(255,255,255,.12)' }}
                        >
                            <Pencil size={12} />
                            Edit
                        </button>
                        <button
                            type='button'
                            onClick={handleUnlink}
                            disabled={updateTask.isPending}
                            className={LINKED_ACTION_CLASS}
                            style={{ borderColor: 'rgba(255,255,255,.12)' }}
                        >
                            <Unlink size={12} />
                            Unlink
                        </button>
                    </div>
                )
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
                        <TaskLinkForm
                            mode='create'
                            initialRef=''
                            initialUrl=''
                            isPending={updateTask.isPending}
                            onCancel={() => setLinking(false)}
                            onSubmit={handleLink}
                        />
                    )}

                    {connections.length === 0 && (
                        <p className='font-mono text-[11.5px] text-text-faint'>
                            Connect Azure DevOps or GitHub in Settings to also publish tasks out.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
