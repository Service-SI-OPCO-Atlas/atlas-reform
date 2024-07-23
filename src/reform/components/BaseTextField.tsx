import { getFieldState, useFormContext } from "@dsid-opcoatlas/reform"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { InputHTMLAttributes, useRef } from "react"
import { InputAttributes, ReformEvents } from "./InputHTMLProps"

export interface InputSelection {
    start: number | null
    end: number | null
    direction?: "forward" | "backward" | "none"
}

export type BaseTextFieldHTMLAttributes = Omit<InputAttributes<"text" | "search" | "number" | "date" | "email" | "password" | "tel" | "time">,
    'accept' |
    'alt' |
    'capture' |
    'height' |
    'multiple' |
    'src' |
    'step' |
    'width'
>

export type BaseTextFieldProps<T extends object, V> = BaseTextFieldHTMLAttributes & ReformEvents<V, T> & {
    toModelValue?: (value: string) => V | null
    toTextValue?: (value: V | null) => string
    acceptInputValue?: (value: string) => boolean
    formatDisplayedValue?: (value: string) => string
    formatOnEdit?: boolean

    /**
     * Method to re-render this `BaseTextField` together with its parent component.
     * 
     * You can use {@link useRender} in the parent component:
     * ```
     * const render = useRender()
     * ...
     * return <BaseTextField render={ render } ... />
     * ```
     */
    render: () => void
}

export function BaseTextField<T extends object, V = string>(props: BaseTextFieldProps<T, V>) {

    const { onChange, onBlur, toModelValue, toTextValue, acceptInputValue, formatDisplayedValue, formatOnEdit, render, ...inputProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<V | null>(context, props.name)

    const inputRef = useRef<HTMLInputElement>(null)
    const previousInputValue = useRef('')
    const previousInputSelection = useRef<InputSelection>({ start: null, end: null })

    const getInputValue = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value
        if (toModelValue)
            return toModelValue(value)
        return value === '' ? null : value as V
    }

    const internalOnSelect = (event: React.FormEvent<HTMLInputElement>) => {
        const target = event.currentTarget
        
        previousInputSelection.current = {
            start: target.selectionStart,
            end: target.selectionEnd,
            direction: target.selectionDirection ?? undefined
        }
        
        // format displayed value when cursor is moved at the end of typed text
        if (formatOnEdit  !== false && formatDisplayedValue && target.selectionStart === target.value.length) {
            const formattedValue = formatDisplayedValue(target.value)
            if (target.value !== formattedValue)
                target.value = formattedValue
        }
    }

    const internalOnInput = (event: React.FormEvent<HTMLInputElement>) => {
        const target = event.currentTarget
        
        // Discard changes if it doesn't conform to acceptInputValue (could also be handled by a beforeInput event)
        if (acceptInputValue?.(target.value) === false) {
            target.value = previousInputValue.current
            const selection = previousInputSelection.current!
            target.setSelectionRange(selection.start, selection.end, selection.direction)
        }
        // format displayed value when cursor is at the end of typed text
        else if (formatOnEdit !== false && formatDisplayedValue && target.selectionStart === target.value.length) {
            const formattedValue = formatDisplayedValue(target.value)
            if (target.value !== formattedValue)
                target.value = formattedValue
        }
    }

    const internalOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        previousInputValue.current = event.currentTarget.value
        const value = getInputValue(event)
        if (value !== fieldState.value) {
            context.setValue(props.name, value)
            context.validateAt(props.name) && render()
            onChange?.(value, context, getParentPath(props.name) ?? undefined)
        }
    }

    const internalOnBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const value = getInputValue(event)
        context.setValue(props.name, value, true)
        onBlur?.(value, context, getParentPath(props.name) ?? undefined)
    }

    // If this is the first render or if this input isn't currently edited
    if (inputRef.current == null || inputRef.current !== document.activeElement) {
        const convertedValue = toTextValue?.(fieldState.value) ?? String(fieldState.value ?? '')
        const value = formatDisplayedValue?.(convertedValue) ?? convertedValue
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
