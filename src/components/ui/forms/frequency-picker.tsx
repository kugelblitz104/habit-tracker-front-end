import { type Frequency } from '@/types/types';
import { Field, Input, Label, Radio, RadioGroup } from '@headlessui/react';
import { useState } from 'react';

type InlineNumberFieldProps = {
    name: string;
    placeholder: string;
    onChange: (newString: string) => void;
};

type FrequencyPickerProps = {
    selected: Frequency;
    onSelectedChange: (newFrequency: Frequency) => void;
    frequencies?: Frequency[];
};

const InlineNumberField = ({ name, placeholder, onChange }: InlineNumberFieldProps) => {
    return (
        <Field className='mx-1 inline-block border-color-white'>
            <Input
                name={name}
                placeholder={placeholder}
                className='w-6 text-center bg-black rounded-md'
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
    const [freq, setFreq] = useState(frequencies[3]?.frequency ?? 3);
    const [range, setRange] = useState(frequencies[3]?.range ?? 7);

    return (
        <Field className='my-2 space-y-1'>
            <Label className='block'>Frequency</Label>
            <RadioGroup value={selected} onChange={onSelectedChange} className='flex gap-2'>
                {frequencies.map((freq) => (
                    <Radio
                        key={freq.name}
                        value={freq}
                        className={`
                            flex-1
                            rounded-md
                            text-center
                            px-3 py-1
                            ${selected.name === freq.name ? 'bg-slate-600' : ''}
                        `}
                    >
                        {freq.name}
                    </Radio>
                ))}
            </RadioGroup>
            <span className={`mt-2 ${selected.name != 'custom' && 'hidden'}`}>
                <InlineNumberField
                    name='frequency'
                    placeholder='3'
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
        </Field>
    );
};
