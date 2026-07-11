import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Item row shared by the root menu and every submenu. */
export const itemClass =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] hover:bg-white/5';

export const dateInputClass =
    'w-full rounded-button border px-2 py-1 font-mono text-[12px] text-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-now-accent';

export const dateInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark'
};

/** Highlight background for the current value in a submenu list. */
export const CURRENT_BG = 'rgba(255,255,255,0.05)';

/** Quick-pick date offsets shared by the Due and Scheduled submenus. */
export const DATE_QUICK_SETS = [
    { label: 'Today', offset: 0 },
    { label: 'Tomorrow', offset: 1 },
    { label: 'Next week', offset: 7 }
] as const;

export const Divider = () => (
    <div className='my-1 border-t' style={{ borderColor: 'var(--surface-card-border)' }} />
);

/** Submenu header: uppercase mono label that navigates back to the root view. */
export const SubHeader = ({ label, onBack }: { label: string; onBack: () => void }) => (
    <button
        type='button'
        onClick={onBack}
        className='flex w-full items-center gap-1 rounded-[6px] px-2 py-1.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint hover:bg-white/5'
    >
        <ChevronLeft size={12} />
        {label}
    </button>
);

/** Root row that drills into a submenu; shows the current value as a hint. */
export const RootRow = ({
    label,
    hint,
    onClick
}: {
    label: string;
    hint: string;
    onClick: () => void;
}) => (
    <button type='button' onClick={onClick} className={itemClass}>
        <span className='text-text-secondary'>{label}</span>
        <span className='ml-auto max-w-[104px] truncate font-mono text-[10.5px] text-text-faint'>
            {hint}
        </span>
        <ChevronRight size={13} className='shrink-0 text-text-muted' />
    </button>
);
