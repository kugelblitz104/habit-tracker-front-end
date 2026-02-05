import { useRecentColors } from '@/lib/use-recent-colors';
import { Field, Input, Label } from '@headlessui/react';
import { HexColorPicker } from 'react-colorful';

type ColorPickerProps = {
    color: string;
    onColorChange: (newColor: string) => void;
};

export const ColorPicker = ({ color, onColorChange }: ColorPickerProps) => {
    const { recentColors } = useRecentColors();

    return (
        <Field>
            <Label className='block'>Color</Label>
            <div className='flex space-x-2'>
                <HexColorPicker color={color} onChange={onColorChange} className='w-10 h-10' />
                <div className='flex flex-col'>
                    {/* using inline style definition because tailwind does not support dynamic values */}
                    <div
                        style={{ backgroundColor: color }}
                        className='w-27 h-27 rounded-md border-2 border-gray-300'
                    />
                    <Input
                        name='color'
                        value={color}
                        onChange={(e) => onColorChange(e.target.value)}
                        className='block bg-black border-slate rounded-md py-1 px-2 w-27 my-2'
                    />
                    <div className='flex flex-col gap-1'>
                        <span className='text-xs text-gray-400'>Recent</span>
                        <div className='grid grid-cols-6 gap-1'>
                            {Array.from({ length: 6 }).map((_, index) => {
                                const recentColor = recentColors[index];
                                return (
                                    <button
                                        key={index}
                                        type='button'
                                        onClick={() => recentColor && onColorChange(recentColor)}
                                        disabled={!recentColor}
                                        style={{ backgroundColor: recentColor || 'transparent' }}
                                        className={`
                                            w-6 h-6 rounded-full border-2
                                            ${
                                                recentColor
                                                    ? 'border-gray-300 cursor-pointer hover:scale-110 transition-transform'
                                                    : 'border-dashed border-gray-600'
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
