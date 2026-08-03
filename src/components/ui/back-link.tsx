import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

type BackLinkProps = {
    to: string;
    /** Where it returns to, e.g. "Today". Rendered after the chevron. */
    label: string;
    /**
     * Accessible name. Defaults to "Back to {label}", which matters because the
     * app header already has nav links named "Today", "Habits" and "Projects":
     * without this the back link would be a second link with the same name.
     * Override when the default reads badly (a label of "Back" would give
     * "Back to Back").
     */
    ariaLabel?: string;
    /** Surface-specific typography and spacing. */
    className?: string;
};

/**
 * Back link for the full-page detail routes (task, habit, project).
 *
 * The chevron is a lucide icon rather than a text glyph, so it picks up the
 * stroke weight and optical alignment of every other icon in the chrome. It is
 * `aria-hidden` since the label already says where the link goes.
 */
export const BackLink = ({ to, label, ariaLabel, className = '' }: BackLinkProps) => (
    <Link
        to={to}
        aria-label={ariaLabel ?? `Back to ${label}`}
        className={`inline-flex items-center gap-0.5 ${className}`}
    >
        <ChevronLeft size={14} aria-hidden='true' />
        {label}
    </Link>
);
