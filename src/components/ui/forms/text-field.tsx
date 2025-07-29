import { Field, Input, Label } from "@headlessui/react"

type TextFieldProps = {
    name: string
    label?: string
    placeholder?: string
}

export const TextField = ({
    name,
    label,
    placeholder = ""
}:TextFieldProps) => {
    return (
        <Field className="my-2">
            {label && <Label className="block">{label}</Label>}
            <Input className="block bg-black border-slate rounded-md py-1 px-2" name={name} type="text" placeholder={placeholder}/>
        </Field>
    )
}