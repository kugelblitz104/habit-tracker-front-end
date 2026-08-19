import { Switch } from '@headlessui/react';

type EmberToggleProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Accessible name for the switch (there is no visible label element). */
    label: string;
    disabled?: boolean;
    /** md = preference rows (44x24, knob 19); sm = connection rows (36x24, knob 16). */
    size?: 'md' | 'sm';
};

const DIMS = {
    md: { width: 44, height: 24, knob: 19 },
    sm: { width: 36, height: 24, knob: 16 }
} as const;

const KNOB_INSET = 2;

/**
 * The ember design's pill toggle: ON = warm gradient track + white knob on the
 * right, OFF = faint track + muted knob on the left.
 *
 * The track's own box already clears the 24px AA target minimum in both
 * dimensions, and it must keep its fixed height: it is `rounded-chip`, so a
 * square track renders as a circle rather than a pill. The 44px coarse-pointer
 * target comes from `hit-target`, which grows the pointer area via a centred
 * pseudo-element and contributes nothing to layout. Preference and connection
 * rows sit about 52px apart, so those areas do not overlap between adjacent
 * switches.
 */
export const EmberToggle = ({
    checked,
    onChange,
    label,
    disabled = false,
    size = 'md'
}: EmberToggleProps) => {
    const d = DIMS[size];

    return (
        <Switch
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            aria-label={label}
            className='hit-target relative inline-block flex-none rounded-chip outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-now-accent disabled:cursor-not-allowed disabled:opacity-50'
            style={{
                width: d.width,
                height: d.height,
                background: checked ? 'var(--toggle-on-track)' : 'var(--toggle-off-track)'
            }}
        >
            <span
                className='absolute rounded-full transition-all duration-150'
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: checked ? d.width - d.knob - KNOB_INSET : KNOB_INSET,
                    width: d.knob,
                    height: d.knob,
                    backgroundColor: checked ? '#ffffff' : 'var(--toggle-off-knob)'
                }}
            />
        </Switch>
    );
};
