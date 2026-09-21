import { buttonClass, buttonStyle } from '@/components/ui/buttons/button-styles';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** A link, or a plain action. `to` picks which. */
export type BannerAction = { label: string; to: string } | { label: string; onClick: () => void };

type BannerProps = {
    /** The one thing the banner is telling you, as a sentence fragment. */
    title: string;
    /** The supporting line under it: a count, a date, why you are seeing this. */
    detail?: string;
    /** Leading glyph. Rendered `aria-hidden` - the title carries the meaning. */
    icon?: ReactNode;
    action?: BannerAction;
    /**
     * Shown only when given, so a banner that must be acted on cannot be
     * waved away. The banner does NOT own dismissal state: whether it renders
     * at all is the caller's business, which is what lets one caller forget
     * for a session and another remember for 30 days.
     */
    onDismiss?: () => void;
    /** Accessible name for the dismiss control - "Dismiss" alone is ambiguous
     *  when two banners could be on screen. */
    dismissLabel?: string;
    className?: string;
};

/**
 * A full-width notice above a page's content: something worth saying, with at
 * most one thing to do about it.
 *
 * Passive by design. This is for a message on a page you were already on -
 * never a modal, never a toast. A toast interrupts and disappears; this waits.
 */
export const Banner = ({
    title,
    detail,
    icon,
    action,
    onDismiss,
    dismissLabel = 'Dismiss',
    className = ''
}: BannerProps) => (
    <div
        className={`flex flex-wrap items-center gap-3 rounded-card border p-4 ${className}`.trim()}
        style={CARD_SURFACE_STYLE}
    >
        {icon && (
            <span aria-hidden='true' className='shrink-0 text-text-muted'>
                {icon}
            </span>
        )}

        <div className='min-w-0 flex-1'>
            <p className='font-display text-[14px] text-text-primary'>{title}</p>
            {detail && <p className='font-mono text-[11px] text-text-faint'>{detail}</p>}
        </div>

        {action &&
            ('to' in action ? (
                // A Link carrying the button's classes rather than a Link inside
                // a Button: nesting an anchor in a button is invalid HTML.
                <Link
                    to={action.to}
                    className={buttonClass({ variant: 'primary', size: 'sm' })}
                    style={buttonStyle('primary')}
                >
                    {action.label}
                </Link>
            ) : (
                <button
                    type='button'
                    onClick={action.onClick}
                    className={buttonClass({ variant: 'primary', size: 'sm' })}
                    style={buttonStyle('primary')}
                >
                    {action.label}
                </button>
            ))}

        {onDismiss && (
            <button
                type='button'
                onClick={onDismiss}
                aria-label={dismissLabel}
                // 44px: an isolated control with no near neighbour, so it can
                // take the full coarse-pointer target rather than an exemption.
                className='flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-faint transition-colors hover:text-text-primary'
            >
                <X aria-hidden='true' className='h-4 w-4' />
            </button>
        )}
    </div>
);
