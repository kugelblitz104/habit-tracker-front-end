type SectionHeaderProps = {
    label: string;
    /** Header accent — colors the label text (and the dot, when shown). */
    color?: string;
    count: number;
    /** Leading color-square dot (task-list-view's grouped sections only —
     *  band sections don't show one even though they also carry a color). */
    dot?: boolean;
};

/**
 * Uppercase mono section label + count chip (+ optional leading color dot).
 * Shared inner content for the flat task list's group headers and the band
 * sections; callers keep their own outer wrapper (plain div vs a collapse
 * button) since those differ per surface.
 */
export const SectionHeader = ({ label, color, count, dot }: SectionHeaderProps) => (
    <>
        {dot && color && (
            <span className='h-2 w-2 rounded-[2px]' style={{ backgroundColor: color }} />
        )}
        <h2
            className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em]'
            style={{ color: color ?? 'var(--color-text-muted)' }}
        >
            {label}
        </h2>
        <span className='font-mono text-[11px] text-text-faint'>{count}</span>
    </>
);
