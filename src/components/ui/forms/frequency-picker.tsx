import { type Frequency } from '@/types/types';
import { Field, Input, Label, Radio, RadioGroup } from '@headlessui/react';
import { useState } from 'react';

type InlineNumberFieldProps = {
    name: string;
    placeholder: string;
    defaultValue?: number;
    onChange: (newString: string) => void;
};

type FrequencyPickerProps = {
    selected: Frequency;
    onSelectedChange: (newFrequency: Frequency) => void;
    frequencies?: Frequency[];
};

const labelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

const InlineNumberField = ({
    name,
    placeholder,
    defaultValue,
    onChange
}: InlineNumberFieldProps) => {
    return (
        <Field className='mx-1 inline-block'>
            <Input
                name={name}
                placeholder={placeholder}
                defaultValue={defaultValue}
                className='w-8 rounded-button border px-1 py-0.5 text-center font-mono text-[12px] text-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-now-accent'
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)'
                }}
                onChange={(e) => onChange(e.target.value)}
            />
        </Field>
    );
};

export const FrequencyPicker = ({
    selected,
    onSelectedChange,
    frequencies = [
        // TODO: enum?
        { name: 'daily', frequency: 1, range: 1 },
        { name: 'weekly', frequency: 1, range: 7 },
        { name: 'monthly', frequency: 1, range: 30 },
        { name: 'custom', frequency: 3, range: 7 }
    ]
}: FrequencyPickerProps) => {
    // Seed the custom inputs from the current selection when it's already custom
    // (editing an existing custom habit), else fall back to the custom preset.
    const isCustom = selected.name === 'custom';
    const [freq, setFreq] = useState(
        isCustom ? selected.frequency : frequencies[3]?.frequency ?? 3
    );
    const [range, setRange] = useState(isCustom ? selected.range : frequencies[3]?.range ?? 7);

    return (
        <Field className='mb-3'>
            <Label className={labelClass}>Frequency</Label>
            <RadioGroup value={selected} onChange={onSelectedChange} className='flex gap-2'>
                {frequencies.map((freq) => {
                    const isSelected = selected.name === freq.name;
                    return (
                        <Radio
                            key={freq.name}
                            value={freq}
                            className='flex-1 cursor-pointer rounded-button border px-3 py-1.5 text-center font-mono text-[12px] transition-colors'
                            style={{
                                backgroundColor: isSelected
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : 'var(--surface-input-bg)',
                                borderColor: isSelected
                                    ? 'var(--color-habit-accent)'
                                    : 'var(--surface-input-border)',
                                color: isSelected
                                    ? 'var(--color-habit-accent)'
                                    : 'var(--color-text-secondary)'
                            }}
                        >
                            {freq.name}
                        </Radio>
                    );
                })}
            </RadioGroup>
            {/* Conditionally rendered (not class-toggled): `hidden` and
                `inline-block` are both display utilities, so relying on class
                order to hide this row is unreliable. */}
            {selected.name === 'custom' && (
                <span className='mt-2 inline-block font-mono text-[12px] text-text-secondary'>
                    <InlineNumberField
                        name='frequency'
                        placeholder='3'
                        defaultValue={isCustom ? selected.frequency : undefined}
                        onChange={(e) => {
                            const value = Number.parseInt(e) || 3;
                            setFreq(value);
                            const newRange = Math.max(value, range);
                            if (value > range) {
                                setRange(value);
                            }
                            onSelectedChange({
                                name: 'custom',
                                frequency: value,
                                range: newRange
                            });
                        }}
                    />
                    time(s) every
                    <InlineNumberField
                        name='range'
                        placeholder='7'
                        defaultValue={isCustom ? selected.range : undefined}
                        onChange={(e) => {
                            const value = Number.parseInt(e) || 7;
                            const newFreq = Math.min(freq, value);
                            if (freq > value) {
                                setFreq(value);
                            }
                            setRange(value);
                            onSelectedChange({
                                name: 'custom',
                                frequency: newFreq,
                                range: value
                            });
                        }}
                    />
                    days
                </span>
            )}
        </Field>
    );
};
