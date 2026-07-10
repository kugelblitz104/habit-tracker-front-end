import type { CSSProperties, ReactNode } from 'react';

/** Mono uppercase section-label color from the Settings design frame. */
export const SETTINGS_LABEL_COLOR = '#a5988a';

/**
 * Ghost button treatment shared across the settings cards ("Switch", "Manage",
 * inline form cancels). Border color comes via inline style so the exact
 * design alpha (rgba(255,255,255,.14)) is preserved.
 */
export const settingsGhostButtonClass =
    'rounded-[8px] border px-3 py-1.5 text-[12.5px] text-text-secondary-soft transition-colors ' +
    'hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50';

export const settingsGhostBorder = 'rgba(255,255,255,.14)';

/** Primary gradient button (Save changes / Create profile). */
export const settingsPrimaryButtonClass =
    'inline-block rounded-[9px] px-[18px] py-2.5 text-[13.5px] font-semibold transition-opacity ' +
    'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

export const settingsPrimaryButtonStyle: CSSProperties = {
    background: 'var(--button-primary-gradient)',
    color: 'var(--button-primary-text)'
};

/** Themed input used by the settings inline forms (Account, connections…). */
export const settingsInputClass =
    'w-full rounded-[9px] border px-3 py-2.5 font-display text-[14px] text-text-primary ' +
    'outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 ' +
    'focus-visible:ring-now-accent';

export const settingsInputStyle: CSSProperties = {
    backgroundColor: 'rgba(255,255,255,.04)',
    borderColor: 'rgba(255,255,255,.1)'
};

export const settingsFieldLabelClass = 'mb-1.5 block text-[11.5px]';

export const settingsFieldLabelStyle: CSSProperties = { color: '#9a8f81' };

type SettingsCardProps = {
    /** Mono uppercase section label ("Profiles", "Danger zone"…). */
    label: string;
    /** Label color override (danger zone uses #d1889a). */
    labelColor?: string;
    /** Optional element rendered on the right of the label row (e.g. the profile selector pill). */
    labelRight?: ReactNode;
    /** Spacing under the label row; the design varies per card (6–16px). */
    labelGapClass?: string;
    /** Card surface overrides (danger zone tint). */
    style?: CSSProperties;
    children: ReactNode;
};

/**
 * Ember settings card: rgba surface, 1px hairline border, 14px radius,
 * ~20x22px padding, with the mono uppercase section label on top.
 */
export const SettingsCard = ({
    label,
    labelColor = SETTINGS_LABEL_COLOR,
    labelRight,
    labelGapClass = 'mb-[15px]',
    style,
    children
}: SettingsCardProps) => {
    return (
        <section
            className='rounded-card border p-4 md:px-[22px] md:py-5'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)',
                ...style
            }}
        >
            <div className={`flex items-center justify-between gap-3 ${labelGapClass}`}>
                <div
                    className='font-mono text-[10px] font-medium uppercase tracking-[0.14em]'
                    style={{ color: labelColor }}
                >
                    {label}
                </div>
                {labelRight}
            </div>
            {children}
        </section>
    );
};
