import { ColorPicker } from "@/components/ui/forms/color-picker";
import { FrequencyPicker } from "@/components/ui/forms/frequency-picker";
import { LabeledSwitch } from "@/components/ui/forms/labeled-switch";
import { TextField } from "@/components/ui/forms/text-field";
import type { HabitCreate } from "@/types/types";
import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Field, Fieldset, Input, Label, Radio, RadioGroup, Switch, Textarea, Button} from "@headlessui/react";
import { useState } from "react";
import { Controller, FormProvider, useForm, type SubmitHandler } from "react-hook-form";

type AddHabitModalProps = {
    isOpen: boolean;
    userId: number
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void; //should return a habit?
}

interface IAddModalFormInput {
    name: string,
    question: string
    color: string,
    frequency: number,
    range: number,
    reminder: boolean,
    notes: string
}

export const AddHabitModal = ({
    isOpen = false,
    userId,
    onClose,
    handleAddHabit
}: AddHabitModalProps) => {
    const [selected, setSelected] = useState({
        name: "daily", frequency: 1, range: 1
    });
    const [reminderChecked, setReminderChecked] = useState(false);
    const [color, setColor] = useState("#aabbcc");
    const methods = useForm<IAddModalFormInput>();
    const onSubmit: SubmitHandler<IAddModalFormInput> = (data) => console.log(data)

    // const onSubmit = (formData: FormData) => {
    //     const customChecked = (selected.name === 'custom')
    //     const newHabit = {
    //         name: formData.get('name'),
    //         question: formData.get('question'),
    //         color: color,
    //         frequency: customChecked? formData.get('frequency') : selected.frequency,
    //         range: customChecked? formData.get('range') : selected.range,
    //         reminder: reminderChecked,
    //         notes: formData.get('note')
    //     }
    //     handleAddHabit(newHabit);
    // };
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
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <Fieldset className="space-y-1">
                                <TextField required label="Habit name" name="name" placeholder="What will you do?" />
                                <TextField label="Question" name="question" placeholder="What signifies completion?"/>
                                {/* <Controller name="color" control={methods.control}
                                    render={({ field }) => <ColorPicker {...field} color={color} onColorChange={setColor}/>}
                                /> */}
                                <ColorPicker color={color} onColorChange={setColor} />
                                <FrequencyPicker selected={selected} onSelectedChange={setSelected} />
                                <LabeledSwitch label="Reminder" checked={reminderChecked} onChange={setReminderChecked} />
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
                    </FormProvider>
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