import { TextField } from "@/components/ui/forms/text-field";
import type { Habit, HabitCreate } from "@/types/types";
import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Field, Fieldset, Input, Label, Radio, RadioGroup, Switch, Textarea } from "@headlessui/react";
import { useState } from "react";

type AddHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void; //should return a habit?
}

type InlineNumberFieldProps = {
    name: string
}

const frequencies = [
    {name: 'daily', frequency: 1, range: 1}
,   {name: 'weekly', frequency: 1, range: 7}
,   {name: 'monthly', frequency: 1, range: 30}
,   {name: 'custom', frequency: 3, range: 7}
]

const InlineNumberField = ({
    name
}: InlineNumberFieldProps) => {
    return (
        <Field className="mx-1 inline-block border-color-white">
            <Input name={name} className="w-6 text-center bg-black rounded-md"/>
        </Field>
    )
}

export const AddHabitModal = ({
    isOpen = false,
    onClose,
    handleAddHabit
}: AddHabitModalProps) => {
    const [showCustomFreq, setShowCustomFreq] = useState(false)
    const [selected, setSelected] = useState(frequencies[0])
    const [reminderChecked, setReminderChecked] = useState(false)

    const onSubmit = (formData: FormData) => {
        console.log('submitted!')
    }
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
                            {/* TODO: Change input types:
                                Color: color picker
                                Frequency: radio/dropdown?
                                Reminder: Switch?
                                Notes: Text Area?
                            */}
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
                                <InlineNumberField name="frequency"/>time(s) every
                                <InlineNumberField name="range"/>days
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
                            <Field>
                                <Label className="block">Notes</Label>
                                <Textarea name="note" className="block bg-black border-slate rounded-md py-1 px-2 w-full"/>
                            </Field>
                        </Fieldset>
                        <CloseButton>Close</CloseButton>
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