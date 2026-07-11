import { HexColorSwatchInput } from '@/components/ui/forms/hex-color-swatch-input';
import { useState } from 'react';
import {
    settingsGhostBorder,
    settingsGhostButtonClass,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from './settings-card';

// Accept webcal:// too (Proton/Apple surface subscription links with that
// pseudo-scheme); it's rewritten to https:// before submit.
const isHttpUrl = (value: string): boolean => /^(https?|webcal):\/\/\S+$/i.test(value.trim());

/** Rewrite webcal:// subscription links to plain https:// (mirrors the backend). */
const normalizeIcsUrl = (value: string): string => {
    const trimmed = value.trim();
    return /^webcal:\/\//i.test(trimmed) ? `https://${trimmed.slice('webcal://'.length)}` : trimmed;
};

// Mirrors the backend's color validation (`^#[0-9A-Fa-f]{6}$`).
const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);

export type ConnectionFormValues = {
    name: string;
    url: string;
    provider: string;
    color: string;
};

type ConnectionFormProps = {
    initial: ConnectionFormValues;
    submitLabel: string;
    pending: boolean;
    onSubmit: (values: ConnectionFormValues) => void;
    onCancel: () => void;
};

/**
 * Inline calendar-connection form shared by "+ Connect a calendar" and the
 * per-row edit affordance. Name + http(s) ICS URL required; provider optional;
 * color via the swatch + hex text input pair (the full ColorPicker is too
 * large for an inline row).
 */
export const ConnectionForm = ({
    initial,
    submitLabel,
    pending,
    onSubmit,
    onCancel
}: ConnectionFormProps) => {
    const [values, setValues] = useState<ConnectionFormValues>(initial);
    const [touched, setTouched] = useState(false);

    const nameValid = values.name.trim().length > 0;
    const urlValid = isHttpUrl(values.url);
    const colorValid = isHexColor(values.color);
    const canSubmit = nameValid && urlValid && colorValid && !pending;

    const set = (patch: Partial<ConnectionFormValues>) =>
        setValues((prev) => ({ ...prev, ...patch }));

    const handleSubmit = () => {
        setTouched(true);
        if (!canSubmit) return;
        onSubmit({
            ...values,
            name: values.name.trim(),
            url: normalizeIcsUrl(values.url),
            provider: values.provider.trim(),
            color: values.color
        });
    };

    return (
        <div
            className='rounded-[10px] border border-dashed p-3.5'
            style={{ borderColor: 'rgba(255,255,255,.12)' }}
        >
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <label>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Name
                    </span>
                    <input
                        type='text'
                        value={values.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder='e.g. Work'
                        autoFocus
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                    {touched && !nameValid && (
                        <span className='mt-1 block text-[11px] text-danger'>Name is required</span>
                    )}
                </label>
                <label>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Provider (optional)
                    </span>
                    <input
                        type='text'
                        value={values.provider}
                        onChange={(e) => set({ provider: e.target.value })}
                        placeholder='e.g. Google'
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                </label>
                <label className='md:col-span-2'>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        ICS URL
                    </span>
                    <input
                        type='text'
                        value={values.url}
                        onChange={(e) => set({ url: e.target.value })}
                        placeholder='https://…/calendar.ics'
                        className={`${settingsInputClass} font-mono text-[12.5px]`}
                        style={settingsInputStyle}
                    />
                    {touched && !urlValid && (
                        <span className='mt-1 block text-[11px] text-danger'>
                            Enter an http(s) or webcal:// URL
                        </span>
                    )}
                </label>
            </div>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
                <HexColorSwatchInput
                    value={values.color}
                    onChange={(color) => set({ color })}
                    swatchLabel='Calendar color'
                    hexLabel='Calendar color hex'
                    error={
                        touched && !colorValid ? 'Use a 6-digit hex color, e.g. #6f9fe0' : undefined
                    }
                />
                <span className='ml-auto flex items-center gap-1.5'>
                    <button
                        type='button'
                        onClick={handleSubmit}
                        disabled={pending}
                        className={settingsPrimaryButtonClass}
                        style={settingsPrimaryButtonStyle}
                    >
                        {submitLabel}
                    </button>
                    <button
                        type='button'
                        onClick={onCancel}
                        className={settingsGhostButtonClass}
                        style={{ borderColor: settingsGhostBorder }}
                    >
                        Cancel
                    </button>
                </span>
            </div>
        </div>
    );
};
