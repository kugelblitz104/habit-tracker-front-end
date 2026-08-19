import { fieldClass, fieldStyle } from '@/components/ui/forms/field-tiers';
import { formLabelClass } from '@/components/ui/forms/form-field-styles';
import { Input } from '@/components/ui/forms/input';
import { useRecentColors } from '@/lib/use-recent-colors';
import { Field, Input as HeadlessInput, Label } from '@headlessui/react';
import { HexColorPicker } from 'react-colorful';

type ColorPickerProps = {
    mode?: 'full' | 'inline';
    color: string;
    onColorChange: (newColor: string) => void;
    /** Accessible name for the native color swatch (`inline` mode only). */
    swatchLabel?: string;
    /** 34px (connections row) or 38px (profiles gradient); default 34 (`inline` mode only). */
    swatchSize?: 34 | 38;
    /** Paired hex text field (`inline` mode only); omit for swatch-only usage. */
    hexLabel?: string;
    /** Validation message rendered after the hex field (`inline` mode only). */
    error?: string;
    /** Passed through to the native swatch (`inline` mode only). */
    disabled?: boolean;
    /** Passed through to the native swatch (`inline` mode only). */
    title?: string;
};

export const ColorPicker = ({
    mode = 'full',
    color,
    onColorChange,
    swatchLabel,
    swatchSize = 34,
    hexLabel,
    error,
    disabled,
    title
}: ColorPickerProps) => {
    const { recentColors } = useRecentColors();

    if (mode === 'inline') {
        const swatch = (
            <input
                type='color'
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                aria-label={swatchLabel}
                disabled={disabled}
                title={title}
                className='min-h-[28px] min-w-[28px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] cursor-pointer rounded-[9px] border bg-transparent p-0.5 disabled:opacity-50'
                style={{
                    width: swatchSize,
                    height: swatchSize,
                    borderColor: 'rgba(255,255,255,.1)'
                }}
            />
        );

        if (!hexLabel) return swatch;

        return (
            <span className='flex items-center gap-1.5'>
                {swatch}
                <Input
                    tier='settings'
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    aria-label={hexLabel}
                    className='w-24'
                />
                {error && <span className='text-[11px] text-danger'>{error}</span>}
            </span>
        );
    }

    return (
        <Field className='mb-3'>
            <Label className={formLabelClass}>Color</Label>
            <div className='flex space-x-3'>
                <HexColorPicker color={color} onChange={onColorChange} className='w-10 h-10' />
                <div className='flex flex-col'>
                    {/* using inline style definition because tailwind does not support dynamic values */}
                    <div
                        style={{
                            backgroundColor: color,
                            borderColor: 'var(--surface-input-border)'
                        }}
                        className='w-27 h-27 rounded-button border'
                    />
                    <HeadlessInput
                        name='color'
                        value={color}
                        onChange={(e) => onColorChange(e.target.value)}
                        className={`${fieldClass('compact')} my-2 w-27`}
                        style={fieldStyle('compact')}
                    />
                    <div className='flex flex-col gap-1'>
                        <span className='font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint'>
                            Recent
                        </span>
                        <div className='grid grid-cols-6 gap-1'>
                            {Array.from({ length: 6 }).map((_, index) => {
                                const recentColor = recentColors[index];
                                return (
                                    <button
                                        key={index}
                                        type='button'
                                        onClick={() => recentColor && onColorChange(recentColor)}
                                        disabled={!recentColor}
                                        style={{
                                            backgroundColor: recentColor || 'transparent',
                                            borderColor: recentColor
                                                ? 'var(--surface-input-border)'
                                                : undefined
                                        }}
                                        className={`
                                            w-6 h-6 rounded-full border-2
                                            ${
                                                recentColor
                                                    ? 'cursor-pointer hover:scale-110 transition-transform'
                                                    : 'border-dashed border-[var(--surface-input-border)]'
                                            }
                                        `}
                                        title={recentColor || 'Empty slot'}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Field>
    );
};
