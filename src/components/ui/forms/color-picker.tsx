import { Field, Input, Label } from "@headlessui/react"
import { HexColorPicker } from "react-colorful"

type ColorPickerProps = {
    color: string
    onColorChange: (newColor: string) => void
}

export const ColorPicker = ({
    color,
    onColorChange
}: ColorPickerProps) => {
    return (
        <Field>
            <Label className="block">Color</Label>
            <div className="flex space-x-2">
                <HexColorPicker color={color} onChange={onColorChange} className="w-10 h-10" />
                <div>
                    {/* using inline style definition because tailwind does not support dynamic values */}
                    <div
                        style={{ backgroundColor: color }}
                        className="
                            w-22 h-22 rounded-md border-2 border-gray-300
                        "
                    />  
                    <Input
                        name="color"
                        value={color}
                        onChange={e => onColorChange(e.target.value)}
                        className="block bg-black border-slate rounded-md py-1 px-2 w-22
                        my-2"
                    />
                </div>
            </div>
        </Field>
    )
}