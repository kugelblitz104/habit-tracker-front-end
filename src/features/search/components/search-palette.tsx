import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import {
    Combobox,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Dialog,
    DialogBackdrop,
    DialogPanel
} from '@headlessui/react';
import { CheckSquare, Flame, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGlobalSearch, type SearchResult } from '../hooks/use-global-search';

type SearchPaletteProps = {
    open: boolean;
    onClose: () => void;
};

const groupLabelClass =
    'px-3 pt-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint';

const Dot = ({ color }: { color: string }) => (
    <span
        className='h-2.5 w-2.5 shrink-0 rounded-full'
        style={{ backgroundColor: color }}
        aria-hidden='true'
    />
);

const ResultRow = ({ result }: { result: SearchResult }) => (
    <ComboboxOption
        value={result}
        className='flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 font-display text-[13.5px] text-text-secondary data-focus:bg-white/5'
    >
        {result.kind === 'task' && (
            <CheckSquare size={14} className='shrink-0 text-text-faint' aria-hidden='true' />
        )}
        {result.kind === 'habit' && <Flame size={14} className='shrink-0' style={{ color: result.color }} />}
        {result.kind === 'project' && <Dot color={result.color} />}
        <span className='min-w-0 flex-1 truncate' title={result.title}>
            {result.title}
        </span>
        {'meta' in result && result.meta && (
            <span className='shrink-0 font-mono text-[10.5px] text-text-faint'>{result.meta}</span>
        )}
    </ComboboxOption>
);

/**
 * ⌘K command palette: searches the active profile's tasks, habits and projects
 * and navigates to the right surface on select — on wide screens the list page
 * with its detail pane (tasks → /tasks, habits → /habits), on narrow screens
 * the full-page detail route; projects always open their detail page.
 */
export const SearchPalette = ({ open, onClose }: SearchPaletteProps) => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';
    const { tasks, habits, projects, isLoading, isEmpty } = useGlobalSearch(open, query);

    // Start each open with an empty query (clear the previous search).
    useEffect(() => {
        if (open) setQuery('');
    }, [open]);

    const handleSelect = (result: SearchResult | null) => {
        if (!result) return;
        onClose();
        if (result.kind === 'project') {
            navigate(`/projects/${result.id}`);
        } else if (result.kind === 'task') {
            if (isWide) navigate('/tasks', { state: { openTaskId: result.id } });
            else navigate(`/tasks/${result.id}`, { state: { from: '/tasks' } });
        } else {
            if (isWide) navigate('/habits', { state: { openHabitId: result.id } });
            else navigate(`/details/${result.id}`, { state: { from: 'habits' } });
        }
    };

    const hasQuery = query.trim().length > 0;

    return (
        <Dialog open={open} onClose={onClose} className='relative z-50'>
            <DialogBackdrop className='fixed inset-0 bg-black/60' />
            <div className='fixed inset-0 flex justify-center sm:p-4 sm:pt-[12vh]'>
                <DialogPanel
                    className='flex h-[100dvh] w-full flex-col overflow-hidden border shadow-popover sm:h-fit sm:max-h-[70vh] sm:max-w-xl sm:rounded-card'
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--surface-card-border)' }}
                >
                    <Combobox<SearchResult | null> immediate value={null} onChange={handleSelect}>
                        <div
                            className='flex items-center gap-2.5 border-b px-3.5 py-3'
                            style={{ borderColor: 'var(--surface-card-border)' }}
                        >
                            <Search size={16} className='shrink-0 text-text-faint' aria-hidden='true' />
                            <ComboboxInput
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder='Search tasks, habits, projects…'
                                className='w-full bg-transparent font-display text-[15px] text-text-primary outline-none placeholder:text-text-faint'
                            />
                        </div>

                        <ComboboxOptions static className='min-h-0 flex-1 overflow-y-auto p-1'>
                            {!hasQuery ? (
                                <p className='px-3 py-6 text-center font-mono text-[12px] text-text-faint'>
                                    Type to search across tasks, habits and projects.
                                </p>
                            ) : isLoading ? (
                                <p className='px-3 py-6 text-center font-mono text-[12px] text-text-faint'>
                                    Searching…
                                </p>
                            ) : isEmpty ? (
                                <p className='px-3 py-6 text-center font-mono text-[12px] text-text-faint'>
                                    No matches for “{query.trim()}”.
                                </p>
                            ) : (
                                <>
                                    {tasks.length > 0 && (
                                        <>
                                            <div className={groupLabelClass}>Tasks</div>
                                            {tasks.map((r) => (
                                                <ResultRow key={`task-${r.id}`} result={r} />
                                            ))}
                                        </>
                                    )}
                                    {habits.length > 0 && (
                                        <>
                                            <div className={groupLabelClass}>Habits</div>
                                            {habits.map((r) => (
                                                <ResultRow key={`habit-${r.id}`} result={r} />
                                            ))}
                                        </>
                                    )}
                                    {projects.length > 0 && (
                                        <>
                                            <div className={groupLabelClass}>Projects</div>
                                            {projects.map((r) => (
                                                <ResultRow key={`project-${r.id}`} result={r} />
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                        </ComboboxOptions>
                    </Combobox>

                    <div
                        className='hidden items-center gap-4 border-t px-3.5 py-2 font-mono text-[10px] text-text-faint sm:flex'
                        style={{ borderColor: 'var(--surface-card-border)' }}
                    >
                        <span>↑↓ navigate</span>
                        <span>↵ open</span>
                        <span>esc close</span>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
};
