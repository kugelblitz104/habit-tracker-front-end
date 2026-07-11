import { Switch } from '@headlessui/react';

type EmberToggleProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Accessible name for the switch (there is no visible label element). */
    label: string;
    disabled?: boolean;
    /** md = preference rows (40x23, knob 19); sm = connection rows (36x20, knob 16). */
    size?: 'md' | 'sm';
};

const DIMS = {
    md: { width: 40, height: 23, knob: 19 },
    sm: { width: 36, height: 20, knob: 16 }
} as const;

const KNOB_INSET = 2;

/**
 * The ember design's pill toggle: ON = warm gradient track + white knob on the
 * right, OFF = faint track + muted knob on the left.
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
            className='relative inline-block flex-none rounded-chip outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-now-accent disabled:cursor-not-allowed disabled:opacity-50'
            style={{
                width: d.width,
                height: d.height,
                background: checked ? 'var(--toggle-on-track)' : 'var(--toggle-off-track)'
            }}
        >
            <span
                className='absolute rounded-full transition-all duration-150'
                style={{
                    top: KNOB_INSET,
                    left: checked ? d.width - d.knob - KNOB_INSET : KNOB_INSET,
                    width: d.knob,
                    height: d.knob,
                    backgroundColor: checked ? '#ffffff' : 'var(--toggle-off-knob)'
                }}
            />
        </Switch>
    );
};
