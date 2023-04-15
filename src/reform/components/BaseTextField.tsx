import React, { InputHTMLAttributes, useRef } from "react"
import { useRender } from "../useRender"
import { useFormContext } from "../useFormContext"
import { getFieldState } from "../useForm"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"

export interface InputSelection {
    start: number | null
    end: number | null
}

export type BaseTextFieldHTMLAttributes = Omit<InputAttributes<'text' | 'password'>,
    'accept' |
    'alt' |
    'capture' |
    'height' |
    'multiple' |
    'min' |
    'max' |
    'step' |
    'width'
>

export type BaseTextFieldProps<T extends object, V = string> = BaseTextFieldHTMLAttributes & ReformEvents<V, T> & {
    convertInputValue?: (value: string) => V | null
    convertModelValue?: (value: V | null) => string
    formatDisplayedValue?: (value: string) => string
    formatOnInput?: boolean
    acceptInputValue?: (value: string) => boolean
    render: () => void
}

export function BaseTextField<T extends object, V = string>(props: BaseTextFieldProps<T, V>) {

    const { onChange, onBlur, convertInputValue, convertModelValue, formatDisplayedValue, formatOnInput, acceptInputValue, render, ...inputProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<V>(context, props.name)

    const inputRef = useRef<HTMLInputElement>(null)
    const previousInputValue = useRef('')
    const previousInputSelection = useRef<InputSelection>({ start: null, end: null})

    const getInputValue = (input: HTMLInputElement) => {
        if (convertInputValue)
            return convertInputValue(input.value)
        return input.value === '' ? null : input.value as V
    }

    const internalOnSelect = (event: React.FormEvent<HTMLInputElement>) => {
        previousInputSelection.current = {
            start: event.currentTarget.selectionStart,
            end: event.currentTarget.selectionEnd
        }

        if (formatOnInput !== false && formatDisplayedValue && event.currentTarget.selectionStart === event.currentTarget.value.length) {
            const formattedValue = formatDisplayedValue(event.currentTarget.value)
            if (event.currentTarget.value !== formattedValue)
                event.currentTarget.value = formattedValue
        }
    }

    const internalOnInput = (event: React.FormEvent<HTMLInputElement>) => {
        if (acceptInputValue?.(event.currentTarget.value) === false) {
            event.currentTarget.value = previousInputValue.current
            event.currentTarget.setSelectionRange(previousInputSelection.current!.start, previousInputSelection.current!.end)
        }
        else if (formatOnInput !== false && formatDisplayedValue && event.currentTarget.selectionStart === event.currentTarget.value.length) {
            const formattedValue = formatDisplayedValue(event.currentTarget.value) ?? event.currentTarget.value
            if (event.currentTarget.value !== formattedValue)
                event.currentTarget.value = formattedValue
        }
    }

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        previousInputValue.current = event.currentTarget.value
        
        const value = getInputValue(event.currentTarget)
        if (value !== fieldState.value) {
            context.setValue(props.name, value)
            context.validateAt(props.name) && render()
            onChange?.(value, context)
        }
    }

    const internalOnBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const value = getInputValue(event.currentTarget)
        context.setValue(props.name, value, true)
        onBlur?.(value, context)
    }

    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const convertedValue = convertModelValue?.(fieldState.value) ?? (fieldState.value != null ? String(fieldState.value) : '')
        const value = formatDisplayedValue ? formatDisplayedValue(convertedValue) : convertedValue
        if (inputRef.current)
            inputRef.current.value = value
        else
            (inputProps as InputHTMLAttributes<HTMLInputElement>).defaultValue = value
        previousInputValue.current = value
    }

    return (
        <input
            { ...inputProps }
            ref={ inputRef }
            onSelect={ internalOnSelect }
            onInput={ internalOnInput }
            onChange={ internalOnChange }
            onBlur={ internalOnBlur }
        />
    )
}
