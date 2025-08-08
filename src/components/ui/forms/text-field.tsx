import { Field, Input, Label } from '@headlessui/react'
import { useFormContext, type UseFormRegister } from 'react-hook-form'

type TextFieldProps = {
    name: string
    label?: string
    placeholder?: string
    isRequired?: boolean
    isValid?: boolean
}

export const TextField = ({
    name,
    label,
    placeholder = '',
    isRequired = false,
    isValid = true
}:TextFieldProps) => {
    const {
        register,
        formState: {errors}
    } = useFormContext()

    return (
        <Field className='my-2'>
            {label && <Label className='block'>{label}</Label>}
            <Input 
                className={`block bg-black 
                    ${!isValid && 'border-2 border-red-500'}
                    ${isValid && 'border-slate'} 
                    rounded-md py-1 px-2 w-full`}
                {...register(name, {required: isRequired, maxLength: 50})}
                type="text" 
                placeholder={placeholder}
            />
        </Field>
    )
}