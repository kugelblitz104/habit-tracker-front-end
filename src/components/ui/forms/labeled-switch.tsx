import { Field, Label, Switch } from '@headlessui/react';

type LabeledSwitchProps = {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

// Not delegated to `EmberToggle`: this is a different visual treatment (a
// classic h-6 w-11 rounded-full track tinted with `--color-habit-accent` and a
// sliding white knob) rather than the ember pill (custom width/height, warm
// gradient track, absolutely-positioned knob). Delegating would require
// EmberToggle to grow a habit-accent color variant and a differently-shaped
// track, which risks a visible regression here — left as its own
// implementation instead.
export const LabeledSwitch = ({ label, checked, onChange }: LabeledSwitchProps) => {
    return (
        <Field className='mb-3 flex items-center justify-between'>
            <Label className='font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint'>
                {label}
            </Label>
            <Switch
                checked={checked}
                onChange={onChange}
                className='group inline-flex h-6 w-11 items-center rounded-full border transition'
                style={{
                    backgroundColor: checked
                        ? 'var(--color-habit-accent)'
                        : 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)'
                }}
            >
                <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
            </Switch>
        </Field>
    );
};
