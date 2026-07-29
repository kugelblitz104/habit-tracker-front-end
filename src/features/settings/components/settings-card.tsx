import { SECTION_LABEL_COLOR } from '@/components/ui/forms/input-styles';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import type { CSSProperties, ReactNode } from 'react';

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
    labelColor = SECTION_LABEL_COLOR,
    labelRight,
    labelGapClass = 'mb-[15px]',
    style,
    children
}: SettingsCardProps) => {
    return (
        <section
            className='rounded-card border p-4 md:px-[22px] md:py-5'
            style={{
                ...CARD_SURFACE_STYLE,
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
