import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useCreateTask } from '../api/create-tasks';
import type { MenuPoint } from './task-context-menu';

type SubtaskQuickAddProps = {
    profileId: number;
    parentId: number;
    /** Viewport point to open at (the context-menu cursor position). */
    point: MenuPoint;
    onClose: () => void;
};

/**
 * Tiny popover for rapid subtask entry, opened at the cursor from the context
 * menu's "Add subtask…". Enter adds the subtask and keeps the field focused so
 * several can be added in a row; Escape or an outside click closes it.
 */
export const SubtaskQuickAdd = ({ profileId, parentId, point, onClose }: SubtaskQuickAddProps) => {
    const createTask = useCreateTask();
    const [title, setTitle] = useState('');
    const [addedCount, setAddedCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<MenuPoint>(point);

    // Clamp into the viewport once measured.
    useLayoutEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const margin = 8;
        setPos({
            x: Math.max(margin, Math.min(point.x, window.innerWidth - rect.width - margin)),
            y: Math.max(margin, Math.min(point.y, window.innerHeight - rect.height - margin))
        });
    }, [point]);

    // Dismiss on outside pointerdown / Escape / scroll / resize.
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) onClose();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    const add = () => {
        const trimmed = title.trim();
        if (!trimmed || createTask.isPending) return;
        createTask.mutate(
            { profile_id: profileId, parent_id: parentId, title: trimmed },
            {
                onSuccess: () => {
                    setTitle('');
                    setAddedCount((n) => n + 1);
                },
                onError: () => toast.error('Failed to add subtask. Please try again.')
            }
        );
    };

    const panel = (
        <div
            ref={panelRef}
            className='fixed z-50 w-64 rounded-button border p-2 shadow-popover outline-none'
            style={{
                left: pos.x,
                top: pos.y,
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <div className='mb-1 flex items-center justify-between px-0.5'>
                <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint'>
                    Add subtask
                </span>
                {addedCount > 0 && (
                    <span className='font-mono text-[10px] text-text-faint'>
                        {addedCount} added
                    </span>
                )}
            </div>
            <input
                type='text'
                autoFocus
                value={title}
                disabled={createTask.isPending}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        add();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        onClose();
                    }
                }}
                placeholder='Subtask title… (Enter)'
                aria-label='New subtask title'
                className='w-full rounded-button border px-2 py-1.5 font-mono text-[12px] text-text-secondary outline-none placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-now-accent disabled:opacity-50'
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)'
                }}
            />
        </div>
    );

    return createPortal(panel, document.body);
};
