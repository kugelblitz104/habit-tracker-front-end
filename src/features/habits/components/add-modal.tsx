import { TextField } from "@/components/ui/forms/text-field";
import type { Habit, HabitCreate } from "@/types/types";
import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Field, Fieldset, Input, Label } from "@headlessui/react";

type AddHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void; //should return a habit?
}

export const AddHabitModal = ({
    isOpen = false,
    onClose,
    handleAddHabit
}: AddHabitModalProps) => {
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
                    <form>
                        <Fieldset className="space-y-1">
                            <TextField label="Habit name" name="name" placeholder="What will you do?" />
                            <TextField label="Question" name="question" placeholder="What signifies completion?"/>
                            {/* TODO: Change input types:
                                Color: color picker
                                Frequency: radio/dropdown?
                                Reminder: Switch?
                                Notes: Text Area?
                            */}
                            <TextField label="Color" name="question" />
                            <TextField label="Frequency" name="question" />
                            <TextField label="Reminder" name="question" /> 
                            <TextField label="Notes" name="question" />
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