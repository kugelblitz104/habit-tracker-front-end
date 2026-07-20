import type { TaskUpdate } from '@/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { deleteTask } from '../api/delete-tasks';
import { updateTask } from '../api/update-tasks';

const plural = (n: number) => (n === 1 ? 'task' : 'tasks');

/**
 * Fire a task mutation across many ids at once (bulk status / priority / project
 * / delete). Runs the per-task requests concurrently and settles them all, then
 * invalidates the shared task/project caches ONCE (rather than per request) and
 * reports a single toast — full success, or a partial "X of N" when some fail.
 * There's no bulk endpoint server-side, so this composes the existing single
 * PATCH/DELETE calls.
 */
export const useBulkTaskActions = () => {
    const queryClient = useQueryClient();
    const [isPending, setIsPending] = useState(false);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['project'] });
    };

    const run = async (ids: number[], op: (id: number) => Promise<unknown>, verb: string) => {
        if (ids.length === 0 || isPending) return;
        setIsPending(true);
        const results = await Promise.allSettled(ids.map(op));
        invalidate();
        setIsPending(false);
        const failed = results.filter((r) => r.status === 'rejected').length;
        const ok = ids.length - failed;
        if (failed === 0) toast.success(`${ok} ${plural(ok)} ${verb}`);
        else if (ok === 0) toast.error(`Failed to ${verb === 'deleted' ? 'delete' : 'update'} ${plural(ids.length)}`);
        else toast.error(`${verb} ${ok} of ${ids.length} — ${failed} failed`);
    };

    /** Apply the same partial update to every id. */
    const updateMany = (ids: number[], data: TaskUpdate) =>
        run(ids, (id) => updateTask({ taskId: id, data }), 'updated');

    /** Delete every id (guarded by a single confirm). Returns the run promise
     *  when the user confirms, else undefined — so callers can exit selection
     *  mode only on an actual delete. */
    const deleteMany = (ids: number[]) => {
        if (ids.length === 0 || isPending) return;
        if (!window.confirm(`Delete ${ids.length} ${plural(ids.length)}? This cannot be undone.`)) {
            return;
        }
        return run(ids, (id) => deleteTask(id), 'deleted');
    };

    return { updateMany, deleteMany, isPending };
};
