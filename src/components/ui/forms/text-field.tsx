import { Field, Input, Label } from "@headlessui/react"
import { useFormContext, type UseFormRegister } from "react-hook-form"

type TextFieldProps = {
    name: string
    label?: string
    placeholder?: string
    required?: boolean
}

export const TextField = ({
    name,
    label,
    placeholder = "",
    required = false
}:TextFieldProps) => {
    const methods = useFormContext()

    return (
        <Field className="my-2">
            {label && <Label className="block">{label}</Label>}
            <Input 
                className="block bg-black border-slate rounded-md py-1 px-2 w-full" 
                {...methods.register(name, {required: true, maxLength: 50})}
                type="text" 
                placeholder={placeholder}
            />
        </Field>
    )
}