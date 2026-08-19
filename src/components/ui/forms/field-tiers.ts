import type { CSSProperties } from 'react';

import { compactFieldStyle, formFieldStyle } from '@/components/ui/forms/form-field-styles';
import { themedInputStyle } from '@/components/ui/forms/input-styles';

/**
 * The three field tiers: `task`, `compact` and `settings`. `compact` is a
 * sub-tier of `task` (tighter padding, no `w-full`, for dense inline rows),
 * not a third design tier - the deliberate design tiers are task vs Settings,
 * see the note in `input-styles.ts`. What this adds is the target-size floor:
 * the task tier measured 28px and the Settings tier 43px, so neither met the
 * 44px touch minimum, and the files that hand-rolled their own padding
 * measured 21px and missed the 24px AA minimum outright.
 */
export type FieldTier = 'task' | 'compact' | 'settings';

const FLOOR = 'min-h-[28px] pointer-coarse:min-h-[44px]';

const COMMON =
    'border outline-none transition-colors placeholder:text-text-faint ' +
    'focus-visible:ring-1 focus-visible:ring-now-accent';

const TIER: Record<FieldTier, string> = {
    task: `${FLOOR} ${COMMON} w-full rounded-button px-2.5 py-1.5 font-mono text-[12px] text-text-secondary`,
    // `compact` is the task tier without `w-full` and with tighter padding, for
    // dense inline rows (countdown time field, manual time entry, inline log
    // rows). It mirrors the existing `compactFieldClass`. It is NOT a third
    // design tier: the spec's "two deliberate tiers" are task vs Settings, and
    // compact has always been a sub-tier of the task tier.
    compact: `${FLOOR} ${COMMON} rounded-button px-2 py-1 font-mono text-[12px] text-text-secondary`,
    settings: `${FLOOR} ${COMMON} w-full rounded-[9px] px-3 py-2.5 font-display text-[14px] text-text-primary`
};

export const fieldClass = (tier: FieldTier): string => TIER[tier];

export const fieldStyle = (tier: FieldTier): CSSProperties =>
    tier === 'settings'
        ? themedInputStyle
        : tier === 'compact'
          ? compactFieldStyle
          : formFieldStyle;
