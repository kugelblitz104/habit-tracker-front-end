import { TextField } from "@/components/ui/forms/text-field";
import type { Habit, HabitCreate } from "@/types/types";
import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Field, Fieldset, Input, Label, Radio, RadioGroup, Switch, Textarea, Button} from "@headlessui/react";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";

type AddHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void; //should return a habit?
}

type InlineNumberFieldProps = {
    name: string
    placeholder: string
}

const frequencies = [
    // TODO: enum?
    {name: 'daily', frequency: 1, range: 1}
,   {name: 'weekly', frequency: 1, range: 7}
,   {name: 'monthly', frequency: 1, range: 30}
,   {name: 'custom', frequency: 3, range: 7}
]

const InlineNumberField = ({
    name,
    placeholder
}: InlineNumberFieldProps) => {
    return (
        <Field className="mx-1 inline-block border-color-white">
            <Input name={name} placeholder={placeholder} className="w-6 text-center bg-black rounded-md"/>
        </Field>
    )
}

export const AddHabitModal = ({
    isOpen = false,
    onClose,
    handleAddHabit
}: AddHabitModalProps) => {
    const [showCustomFreq, setShowCustomFreq] = useState(false);
    const [selected, setSelected] = useState(frequencies[0]);
    const [reminderChecked, setReminderChecked] = useState(false);
    const [color, setColor] = useState("#aabbcc");

    const onSubmit = (formData: FormData) => {
        const customChecked = (selected.name === 'custom')
        const newHabit = {
            name: formData.get('name'),
            question: formData.get('question'),
            color: color,
            frequency: customChecked? formData.get('frequency') : selected.frequency,
            range: customChecked? formData.get('range') : selected.range,
            reminder: reminderChecked,
            notes: formData.get('note')
        }
        handleAddHabit(newHabit);
    };
    return (
        <Dialog open={isOpen} onClose={onClose} transition 
        className="
            relative z-50
            transition-opacity
            duration-500
            ease-out
            data-closed:opacity-0
        ">
            <DialogBackdrop className="fixed inset-0 bg-black/50"/>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-w-lg space-y-4 rounded-md bg-slate-800 p-8">
                    <DialogTitle as="h2" className='text-2xl font-bold'>Add a new Habit</DialogTitle>
                    <form action={onSubmit}>
                        <Fieldset className="space-y-1">
                            <TextField label="Habit name" name="name" placeholder="What will you do?" />
                            <TextField label="Question" name="question" placeholder="What signifies completion?"/>
                            <Field>
                                <Label className="block">Color</Label>
                                <div className="flex space-x-2">
                                    <HexColorPicker color={color} onChange={setColor} className="w-10 h-10" />
                                    <div>
                                        <div
                                            style={{ backgroundColor: color }}
                                            className="
                                                w-22 h-22 rounded-md border-2 border-gray-300
                                            "
                                        />  
                                        <Input
                                            name="color"
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            className="block bg-black border-slate rounded-md py-1 px-2 w-22
                                            my-2"
                                        />
                                    </div>
                                </div>

                            </Field>
                            <Field className="my-2 space-y-1">
                                <Label className="block">Frequency</Label>
                                <RadioGroup value={selected} onChange={setSelected}
                                className="flex">
                                    {frequencies.map((freq => (
                                        <Radio 
                                            key={freq.name}
                                            value={freq}
                                            className={`
                                                flex-auto
                                                rounded-md
                                                text-center
                                                px-1.5 py-0.5 mx-1
                                                ${selected.name === freq.name ? "bg-slate-600" : ""}
                                            `}
                                        >
                                            {freq.name}
                                        </Radio>
                                    )))}
                                </RadioGroup>
                            <span className={`mt-2 ${(selected.name != 'custom') && 'hidden'}`}>
                                <InlineNumberField name="frequency" placeholder="1"/>time(s) every
                                <InlineNumberField name="range" placeholder="7"/>days
                            </span>
                            </Field>
                            <Field className="items-center">
                                <Label className="mr-2">Reminder</Label> 
                                <Switch
                                    checked={reminderChecked}
                                    onChange={setReminderChecked}
                                    className="group inline-flex h-6 w-11 items-center rounded-full bg-black transition data-checked:bg-blue-600"
                                >
                                    <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
                                </Switch>
                            </Field>
                            <Field className="mb-2">
                                <Label className="block">Notes</Label>
                                <Textarea name="notes" className="block bg-black border-slate rounded-md py-1 px-2 w-full"/>
                            </Field>
                        </Fieldset>
                        <div className="flex space-x-2">
                            <Button type="submit" className="flex-auto bg-sky-500 rounded-md px-2 py-1">Submit</Button>
                            <CloseButton className="flex-auto bg-red-500 rounded-md px-2 py-1">Close</CloseButton>
                        </div>
                    </form>
                </DialogPanel>   
            </div>
        </Dialog>
    )
}

    // user_id: number;
    // name: string;
    // question: string;
    // color: string;
    // frequency: string;
    // reminder: boolean;
    // notes: string;