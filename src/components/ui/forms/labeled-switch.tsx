import { Field, Label, Switch } from "@headlessui/react"

type LabeledSwitchProps = {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}

export const LabeledSwitch = ({
    label,
    checked,
    onChange
}: LabeledSwitchProps) => {
    return (
        <Field className="items-center">
            <Label className="mr-2">{label}</Label> 
            <Switch
                checked={checked}
                onChange={onChange}
                className="group inline-flex h-6 w-11 items-center rounded-full bg-black transition data-checked:bg-blue-600"
            >
                <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
            </Switch>
        </Field>
    )
}