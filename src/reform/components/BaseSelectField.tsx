import { UseFormReturn, getFieldState } from "../useForm"
import { useFormContext } from "../useFormContext"
import { getParentPath } from "@dsid-opcoatlas/yop"
import React, { DOMAttributes, SelectHTMLAttributes, useRef } from "react"

export type BaseSelectFieldHTMLAttributes = (
    Omit<SelectHTMLAttributes<HTMLSelectElement>,
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

        // SelectHTMLAttributes
        'autoComplete' |
        'form' |        
        'multiple' |

        keyof DOMAttributes<HTMLSelectElement>
    > &
    {
        name: string
    }
)

export type BaseSelectFieldProps<T extends object, V> = BaseSelectFieldHTMLAttributes & {
    modelValues: V[]
    toOptionValue: (modelValue: V) => string
    toOptionContent: (modelValue: V) => string
    toModelValue: (optionValue: string) => V
    render: () => void
    onChange?: (modelValue: V, form: UseFormReturn<T>, parentPath?: string) => void
}

/**
 * Provides a basic select field for Reform.
 * 
 * To use it with with a basic { value, label } pair, you can use the following props:
 * ```tsx
 * <BaseSelectField
 *     name="mySelectId"
 *     modelValues={[ null, "1", "2" ]}
 *     toOptionValue={ modelValue => modelValue ?? "" }
 *     toOptionContent={ modelValue => modelValue == null ? "Select..." : `Option ${modelValue}` }
 *     toModelValue={ optionValue => optionValue === "" ? null : optionValue }
 *     render={ myRenderFunction } />
 * ```
 */
export function BaseSelectField<T extends object, V = string | null>(props: BaseSelectFieldProps<T, V>) {

    const { modelValues, toOptionValue, toOptionContent, toModelValue, render, onChange, ...selectProps } = props
    const context = useFormContext<T>()
    const fieldState = getFieldState<V>(context, props.name)

    const selectRef = useRef<HTMLSelectElement>(null)

    const internalOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = toModelValue(event.currentTarget.value)
        if (value !== fieldState.value) {
            context.setValue(props.name, value, true)
            onChange?.(value, context, getParentPath(props.name) ?? undefined)
        }
    }

    // If this is the first render or if this select isn't currently edited
    if (selectRef.current == null || selectRef.current !== document.activeElement) {
        const value = toOptionValue(fieldState.value)
        if (selectRef.current != null)
            selectRef.current.value = value
        else
            (selectProps as SelectHTMLAttributes<HTMLSelectElement>).defaultValue = value
    }

    return (
        <select
            { ...selectProps }
            ref={ selectRef }
            onChange={ internalOnChange }
        >
            { modelValues.map(modelValue => {
                const optionValue = toOptionValue(modelValue)
                return (
                    <option key={ optionValue } value={ optionValue }>
                        { toOptionContent(modelValue)}
                    </option>
                )
            })}
        </select>
    )
}
