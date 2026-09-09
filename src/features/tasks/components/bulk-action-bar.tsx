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

// Both floors, both axes: the same 24px AA / 44px coarse pair `button-styles.ts`
// applies. `All` and the delete icon are each under 44 wide on their content alone.
const barButtonClass =
    'flex min-h-[24px] min-w-[24px] items-center justify-center gap-1 rounded-button px-2.5 py-1 font-mono text-[11px] text-text-secondary outline-none transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] hover:bg-white/5 hover:text-text-primary focus-visible:ring-1 focus-visible:ring-now-accent disabled:opacity-50';

/** Hairline group separator. Only meaningful in the single-row desktop pill. */
const dividerClass = 'mx-1 hidden h-4 w-px bg-white/10 sm:block';

// No single "current" value across a multi-selection, so pass a sentinel the
// submenus can never match — nothing renders as checked.
const NONE = -1;

/**
 * Floating action bar for multi-select. Anchored bottom-center, shown while
 * selection mode is on. The Status / Priority / Move dropdowns reuse the very
 * same submenus as the per-card context menu (opened upward, since the bar sits
 * at the bottom), so bulk edits look and read identically to single edits.
 *
 * Two shapes. From `sm` it is the shrink-to-fit pill: one row, hairline-separated
 * groups, exit button last. Below `sm` its contents are ~456px wide against ~358px
 * of room, so it becomes a full-width rounded bar that wraps: the count and the
 * exit share the first line (the `basis-full` spacer is what forces the break),
 * the actions run along the second. `sm:order-last` is what returns the exit to
 * the end of the pill without needing a second copy of the button.
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
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:px-4'>
        <div
            className='pointer-events-auto flex w-full max-w-full flex-wrap items-center gap-1 rounded-card border px-2 py-2 shadow-popover sm:w-auto sm:flex-nowrap sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-3'
            // The floating-surface treatment, not the card one: `--surface-card-bg`
            // is a 3% white wash, so the task rows underneath read straight through
            // the bar. Same opaque `--bg` the popovers it opens already use.
            style={popoverPanelStyle}
        >
            <span className='px-1 font-mono text-[11px] text-text-muted'>{count} selected</span>

            <button
                type='button'
                onClick={onClose}
                aria-label='Exit selection'
                title='Done'
                className='ml-auto flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full p-1.5 text-text-faint transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] sm:order-last hover:bg-white/5 hover:text-text-primary'
            >
                <X size={14} />
            </button>
            {/* Zero-height full-width item: forces the actions onto their own line
                below `sm`, where the bar is full-width and wrapping. */}
            <span aria-hidden className='h-0 basis-full sm:hidden' />

            <span className={dividerClass} />

            <Popover className='relative'>
                <PopoverButton className={barButtonClass} disabled={isPending || count === 0}>
                    Status
                    <ChevronDown size={12} />
                </PopoverButton>
                <PopoverPanel
                    anchor={{ to: 'top start', gap: 8, padding: 12 }}
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
                    anchor={{ to: 'top start', gap: 8, padding: 12 }}
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
                    anchor={{ to: 'top start', gap: 8, padding: 12 }}
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

            <span className={dividerClass} />

            <button type='button' onClick={onSelectAll} className={barButtonClass}>
                All
            </button>
        </div>
    </div>
);
