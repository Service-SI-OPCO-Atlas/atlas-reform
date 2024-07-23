import { getFieldState } from "../useForm"
import { useFormContext } from "../useFormContext"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"

export type BaseFileFieldHTMLAttributes = Omit<InputAttributes<'file'>,
    'alt' |
    'autocomplete' |
    'dirname' |
    'height' |
    'list' |
    'multiple' |
    'max' |
    'maxLength' |
    'min' |
    'minLength' |
    'placeholder' |
    'readOnly' |
    'size' |
    'src' |
    'step' |
    'type' |
    'width'
>

export type BaseFileFieldProps<T extends object> = BaseFileFieldHTMLAttributes & Omit<ReformEvents<File, T>, 'onBlur'> & {
    render: () => void
}

export function BaseFileField<T extends object>(props: BaseFileFieldProps<T>) {

    const { onChange, render, ...inputProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<boolean | null>(context, props.name)

    const inputRef = useRef<HTMLInputElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0] ?? null
        if (file) {
            context.setValue(props.name, file, true)
            props.onChange?.(file, context, getParentPath(props.name) ?? undefined)
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
            type="file"
            ref={ inputRef }
            onChange={ internalOnChange }
        />
    )
}
