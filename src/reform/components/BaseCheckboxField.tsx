import { getFieldState } from "../useForm"
import { useFormContext } from "../useFormContext"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"

export type BaseCheckboxFieldHTMLAttributes = Omit<InputAttributes<'checkbox'>,
    'accept' |
    'alt' |
    'autocomplete' |
    'capture' |
    'dirname' |
    'height' |
    'list' |
    'max' |
    'maxLength' |
    'min' |
    'minLength' |
    'multiple' |
    'placeholder' |
    'readOnly' |
    'size' |
    'src' |
    'step' |
    'type' |
    'width'
>

export type BaseCheckboxFieldProps<T extends object> = BaseCheckboxFieldHTMLAttributes & Omit<ReformEvents<boolean, T>, 'onBlur'> & {
    render: () => void
}

export function BaseCheckboxField<T extends object>(props: BaseCheckboxFieldProps<T>) {

    const { onChange, render, ...inputProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<boolean | null>(context, props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.checked
        if (value !== fieldState.value) {
            context.setValue(props.name, value, true)
            onChange?.(value, context, getParentPath(props.name) ?? undefined)
        }
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const value = fieldState.value ?? false
        if (inputRef.current)
            inputRef.current.checked = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultChecked = value
    }

    return (
        <input
            { ...inputProps }
            type="checkbox"
            ref={ inputRef }
            onChange={ internalOnChange }
        />
    )
}
