import { useRecentColors } from '@/lib/use-recent-colors';
import { Field, Input, Label } from '@headlessui/react';
import { HexColorPicker } from 'react-colorful';

type ColorPickerProps = {
    color: string;
    onColorChange: (newColor: string) => void;
};

const labelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

export const ColorPicker = ({ color, onColorChange }: ColorPickerProps) => {
    const { recentColors } = useRecentColors();

    return (
        <Field className='mb-3'>
            <Label className={labelClass}>Color</Label>
            <div className='flex space-x-3'>
                <HexColorPicker color={color} onChange={onColorChange} className='w-10 h-10' />
                <div className='flex flex-col'>
                    {/* using inline style definition because tailwind does not support dynamic values */}
                    <div
                        style={{ backgroundColor: color, borderColor: 'var(--surface-input-border)' }}
                        className='w-27 h-27 rounded-button border'
                    />
                    <Input
                        name='color'
                        value={color}
                        onChange={(e) => onColorChange(e.target.value)}
                        className='my-2 block w-27 rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent'
                        style={{
                            backgroundColor: 'var(--surface-input-bg)',
                            borderColor: 'var(--surface-input-border)'
                        }}
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
