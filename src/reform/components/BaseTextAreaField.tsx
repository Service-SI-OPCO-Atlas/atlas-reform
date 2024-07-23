import { getFieldState, useFormContext } from "@dsid-opcoatlas/reform"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { DOMAttributes, TextareaHTMLAttributes, useRef } from "react"
import { ReformEvents } from "./InputHTMLProps"

export type BaseTextAreaFieldHTMLAttributes = (
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,
        // HTMLAttributes
        'name' |

        'value' |

        'defaultValue' |
        'defaultChecked' |
        'suppressContentEditableWarning' |
        'suppressHydrationWarning' |

        'contentEditable' |
        'contextMenu' |
        'hidden' |
        'is' |

        // TextareaHTMLAttributes
        'autoComplete' |
        'dirName' |
        'form' |        

        keyof DOMAttributes<HTMLTextAreaElement>
    > &
    {
        name: string
    }
)

export type BaseTextAreaFieldProps<T extends object, V> = BaseTextAreaFieldHTMLAttributes & ReformEvents<V, T> & {
    render: () => void
}

export function BaseTextAreaField<T extends object>(props: BaseTextAreaFieldProps<T, string | null>) {

    const { render, onChange, onBlur, ...textAreaProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<string | null>(context, props.name)

    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value || null
        if (value !== fieldState.value) {
            context.setValue(props.name, value)
            context.validateAt(props.name) && render()
            onChange?.(value, context, getParentPath(props.name) ?? undefined)
        }
    }

    const internalOnBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value || null
        context.setValue(props.name, value, true)
        onBlur?.(value, context, getParentPath(props.name) ?? undefined)
    }

    // If this is the first render or if this textarea isn't currently edited
    if (textAreaRef.current == null || textAreaRef.current !== document.activeElement) {
        const value = fieldState.value ?? ""
        if (textAreaRef.current != null)
            textAreaRef.current.value = value
        else
            (textAreaProps as TextareaHTMLAttributes<HTMLTextAreaElement>).defaultValue = value
    }

    return (
        <textarea
            { ...textAreaProps }
            ref={ textAreaRef }
            onChange={ internalOnChange }
            onBlur={ internalOnBlur }
        />
    )
}
