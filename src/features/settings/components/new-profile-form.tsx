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

const DEFAULT_COLOR_START = '#e0763f';
const DEFAULT_COLOR_END = '#c14e6a';

export type NewProfileFormValues = {
    name: string;
    color_start: string;
    color_end: string;
};

type NewProfileFormProps = {
    pending: boolean;
    onCreate: (values: NewProfileFormValues) => void;
    onCancel: () => void;
};

/**
 * Inline "+ New profile" create form (dashed row): name + gradient start/end
 * swatches with a live gradient preview. Owns its own draft state; the parent
 * just supplies pending/onCreate/onCancel and unmounts it (via `creating`) to
 * reset it for the next open.
 */
export const NewProfileForm = ({ pending, onCreate, onCancel }: NewProfileFormProps) => {
    const [name, setName] = useState('');
    const [colorStart, setColorStart] = useState(DEFAULT_COLOR_START);
    const [colorEnd, setColorEnd] = useState(DEFAULT_COLOR_END);

    const handleCreate = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate({ name: trimmed, color_start: colorStart, color_end: colorEnd });
    };

    return (
        <div
            className='rounded-row border border-dashed p-[13px]'
            style={{ borderColor: 'rgba(255,255,255,.12)' }}
        >
            <div className='flex flex-wrap items-end gap-3'>
                <label className='min-w-[160px] flex-1'>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Name
                    </span>
                    <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                        }}
                        placeholder='e.g. Work'
                        autoFocus
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                </label>
                <label className='flex flex-col'>
                    <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                        Gradient
                    </span>
                    <span className='flex items-center gap-1.5'>
                        <HexColorSwatchInput
                            value={colorStart}
                            onChange={setColorStart}
                            swatchLabel='Gradient start color'
                            swatchSize={38}
                        />
                        <HexColorSwatchInput
                            value={colorEnd}
                            onChange={setColorEnd}
                            swatchLabel='Gradient end color'
                            swatchSize={38}
                        />
                        <span
                            className='ml-1 inline-block h-[34px] w-[34px] rounded-full'
                            style={{
                                background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`
                            }}
                            aria-hidden='true'
                        />
                    </span>
                </label>
                <span className='flex items-center gap-1.5'>
                    <button
                        type='button'
                        onClick={handleCreate}
                        disabled={!name.trim() || pending}
                        className={settingsPrimaryButtonClass}
                        style={settingsPrimaryButtonStyle}
                    >
                        Create profile
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
