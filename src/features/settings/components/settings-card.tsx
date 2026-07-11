import {
    ghostButtonBorder,
    ghostButtonClass,
    primaryButtonClass,
    primaryButtonStyle
} from '@/components/ui/buttons/button-styles';
import {
    fieldLabelClass,
    fieldLabelStyle,
    SECTION_LABEL_COLOR,
    themedInputClass,
    themedInputStyle
} from '@/components/ui/forms/input-styles';
import type { CSSProperties, ReactNode } from 'react';

// These generic themed tokens now live in `components/ui` (they're used by the
// auth pages and account form too, not just Settings). Re-exported here under
// their historical `settings*` names so existing imports keep working.
export const SETTINGS_LABEL_COLOR = SECTION_LABEL_COLOR;
export const settingsGhostButtonClass = ghostButtonClass;
export const settingsGhostBorder = ghostButtonBorder;
export const settingsPrimaryButtonClass = primaryButtonClass;
export const settingsPrimaryButtonStyle = primaryButtonStyle;
export const settingsInputClass = themedInputClass;
export const settingsInputStyle = themedInputStyle;
export const settingsFieldLabelClass = fieldLabelClass;
export const settingsFieldLabelStyle = fieldLabelStyle;

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
