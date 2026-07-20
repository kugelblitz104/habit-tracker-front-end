import type { ProjectRead } from '@/api';
import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { TaskStatus } from '@/types/types';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ChevronDown, Trash2, X } from 'lucide-react';
import { PrioritySubmenu } from './task-context-menu/priority-submenu';
import { ProjectSubmenu } from './task-context-menu/project-submenu';
import { StatusSubmenu } from './task-context-menu/status-submenu';

type BulkActionBarProps = {
    count: number;
    /** Archived-aware project list for the "move to project" action. */
    projects: ProjectRead[];
    onSetStatus: (status: TaskStatus) => void;
    onSetPriority: (priority: number) => void;
    onSetProject: (projectId: number | null) => void;
    onDelete: () => void;
    /** Select every task currently visible (post-filter). */
    onSelectAll: () => void;
    /** Exit selection mode (also clears the selection). */
    onClose: () => void;
    isPending?: boolean;
};

const barButtonClass =
    'flex items-center gap-1 rounded-button px-2.5 py-1 font-mono text-[11px] text-text-secondary outline-none transition-colors hover:bg-white/5 hover:text-text-primary focus-visible:ring-1 focus-visible:ring-now-accent disabled:opacity-50';

// No single "current" value across a multi-selection, so pass a sentinel the
// submenus can never match — nothing renders as checked.
const NONE = -1;

/**
 * Floating action bar for multi-select. Anchored bottom-center, shown while
 * selection mode is on. The Status / Priority / Move dropdowns reuse the very
 * same submenus as the per-card context menu (opened upward, since the bar sits
 * at the bottom), so bulk edits look and read identically to single edits.
 */
export const BulkActionBar = ({
    count,
    projects,
    onSetStatus,
    onSetPriority,
    onSetProject,
    onDelete,
    onSelectAll,
    onClose,
    isPending = false
}: BulkActionBarProps) => (
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4'>
        <div
            className='pointer-events-auto flex items-center gap-1 rounded-full border py-1.5 pl-3 pr-1.5 shadow-lg'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <span className='px-1 font-mono text-[11px] text-text-muted'>
                {count} selected
            </span>
            <span className='mx-1 h-4 w-px bg-white/10' />

            <Popover className='relative'>
                <PopoverButton className={barButtonClass} disabled={isPending || count === 0}>
                    Status
                    <ChevronDown size={12} />
                </PopoverButton>
                <PopoverPanel
                    anchor={{ to: 'top start', gap: 8 }}
                    className={`${POPOVER_PANEL_CLASS} w-52`}
                    style={popoverPanelStyle}
                >
                    {({ close }) => (
                        <StatusSubmenu
                            status={NONE as TaskStatus}
                            onBack={close}
                            onSelect={(s) => {
                                onSetStatus(s);
                                close();
                            }}
                        />
                    )}
                </PopoverPanel>
            </Popover>

            <Popover className='relative'>
                <PopoverButton className={barButtonClass} disabled={isPending || count === 0}>
                    Priority
                    <ChevronDown size={12} />
                </PopoverButton>
                <PopoverPanel
                    anchor={{ to: 'top start', gap: 8 }}
                    className={`${POPOVER_PANEL_CLASS} w-52`}
                    style={popoverPanelStyle}
                >
                    {({ close }) => (
                        <PrioritySubmenu
                            priority={NONE}
                            onBack={close}
                            onSelect={(p) => {
                                onSetPriority(p);
                                close();
                            }}
                        />
                    )}
                </PopoverPanel>
            </Popover>

            <Popover className='relative'>
                <PopoverButton className={barButtonClass} disabled={isPending || count === 0}>
                    Move
                    <ChevronDown size={12} />
                </PopoverButton>
                <PopoverPanel
                    anchor={{ to: 'top start', gap: 8 }}
                    className={`${POPOVER_PANEL_CLASS} max-h-[60vh] w-56 overflow-y-auto`}
                    style={popoverPanelStyle}
                >
                    {({ close }) => (
                        <ProjectSubmenu
                            projects={projects}
                            currentProjectId={NONE}
                            onBack={close}
                            onSelect={(pid) => {
                                onSetProject(pid);
                                close();
                            }}
                        />
                    )}
                </PopoverPanel>
            </Popover>

            <button
                type='button'
                onClick={onDelete}
                disabled={isPending || count === 0}
                className={`${barButtonClass} hover:!text-danger`}
                title='Delete selected'
            >
                <Trash2 size={13} />
            </button>

            <span className='mx-1 h-4 w-px bg-white/10' />

            <button type='button' onClick={onSelectAll} className={barButtonClass}>
                All
            </button>
            <button
                type='button'
                onClick={onClose}
                aria-label='Exit selection'
                title='Done'
                className='rounded-full p-1.5 text-text-faint transition-colors hover:bg-white/5 hover:text-text-primary'
            >
                <X size={14} />
            </button>
        </div>
    </div>
);
