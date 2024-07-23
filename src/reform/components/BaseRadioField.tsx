import { UseFormReturn, getFieldState } from "../useForm"
import { useFormContext } from "../useFormContext"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes } from "./InputHTMLProps"

export type BaseRadioFieldHTMLAttributes = Omit<InputAttributes<'radio'>,
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

export type BaseRadioFieldProps<T extends object, V> = BaseRadioFieldHTMLAttributes & {
    onChange?: (value: V, form: UseFormReturn<T>, parentPath?: string) => void
    modelValue: V
    render: () => void
}

export function BaseRadioField<T extends object, V = any>(props: BaseRadioFieldProps<T, V>) {

    const { onChange, modelValue, render, ...inputProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<V | null>(context, props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.checked && modelValue !== fieldState.value) {
            context.setValue(props.name, modelValue, true)
            onChange?.(modelValue, context, getParentPath(props.name) ?? undefined)
        }
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const value = fieldState.value === modelValue
        if (inputRef.current)
            inputRef.current.checked = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultChecked = value
    }

    return (
        <input
            { ...inputProps }
            type="radio"
            ref={ inputRef }
            onChange={ internalOnChange }
        />
    )
}
