import { DOMAttributes, InputHTMLAttributes } from "react"
import { UseFormReturn } from "../useForm"

type HTMLInputTypeAttribute =
        | 'button'
        | 'checkbox'
        | 'color'
        | 'date'
        | 'datetime-local'
        | 'email'
        | 'file'
        | 'hidden'
        | 'image'
        | 'month'
        | 'number'
        | 'password'
        | 'radio'
        | 'range'
        | 'reset'
        | 'search'
        | 'submit'
        | 'tel'
        | 'text'
        | 'time'
        | 'url'
        | 'week'
        | (string & {});

export type InputAttributes<InputType extends HTMLInputTypeAttribute> = (
    Omit<InputHTMLAttributes<HTMLInputElement>,
        // HTMLAttributes
        'name' |
        'type' |

        'value' |
        'checked' |

        'defaultValue' |
        'defaultChecked' |
        'suppressContentEditableWarning' |
        'suppressHydrationWarning' |

        'contentEditable' |
        'contextMenu' |
        'hidden' |
        'is' |

        // InputHTMLAttributes
        'alt' |
        'form' |
        'formaction' |
        'formenctype' |
        'formmethod' |
        'formnovalidate' |
        'formtarget' |
        'pattern' |
        'src' |
        keyof DOMAttributes<HTMLInputElement>
    > &
    {
        name: string
        type?: InputType
    }
)

export type ReformEvents<FieldValueType, FormObjectType extends object> = {
    onChange?: (value: FieldValueType | null, form: UseFormReturn<FormObjectType>, parentPath?: string) => void
    onBlur?: (value: FieldValueType | null, form: UseFormReturn<FormObjectType>, parentPath?: string) => void
}
