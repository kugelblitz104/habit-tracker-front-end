import { Field, Label, RadioGroup, Radio, Input} from '@headlessui/react'
import {type Frequency } from '@/types/types'
import { useState } from 'react'

type InlineNumberFieldProps = {
    name: string
    placeholder: string
    onChange: (newString: string) => void
}

type FrequencyPickerProps = {
    selected: Frequency
    onSelectedChange: (newFrequency: Frequency) => void
    frequencies?: Frequency[]
}

const InlineNumberField = ({
    name,
    placeholder,
    onChange
}: InlineNumberFieldProps) => {
    // right now custom values are not working, so disable user input 
    // until I can figure that out
    return (
        <Field disabled className='mx-1 inline-block border-color-white'>
            <Input name={name} placeholder={placeholder} className='w-6 text-center bg-black rounded-md'/>
        </Field>
    )
}

export const FrequencyPicker = ({
    selected,
    onSelectedChange,
    frequencies = [
        // TODO: enum?
        {name: 'daily', frequency: 1, range: 1}
    ,   {name: 'weekly', frequency: 1, range: 7}
    ,   {name: 'monthly', frequency: 1, range: 30}
    ,   {name: 'custom', frequency: 3, range: 7}
    ]
}: FrequencyPickerProps) => {

        
    return (
        <Field className='my-2 space-y-1'>
            <Label className='block'>Frequency</Label>
            <RadioGroup value={selected} onChange={onSelectedChange}
            className='flex'>
                {frequencies.map((freq => (
                    <Radio 
                        key={freq.name}
                        value={freq}
                        className={`
                            flex-auto
                            rounded-md
                            text-center
                            px-1.5 py-0.5 mx-1
                            ${selected.name === freq.name ? 'bg-slate-600' : ''}
                        `}
                    >
                        {freq.name}
                    </Radio>
                )))}
            </RadioGroup>
            <span className={`mt-2 ${(selected.name != 'custom') && 'hidden'}`}>
                <InlineNumberField
                    name='frequency'
                    placeholder='3'
                    onChange={e => {
                        const value = Number.parseInt(e) || 3;
                        onSelectedChange({ ...selected, frequency: value });
                    }}
                />time(s) every
                <InlineNumberField
                    name='range'
                    placeholder='7'
                    onChange={e => {
                        const value = Number.parseInt(e) || 7;
                        onSelectedChange({ ...selected, range: value });
                    }}
                />days
            </span>
        </Field>
    )
}