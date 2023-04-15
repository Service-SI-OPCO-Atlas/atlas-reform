import { DOMAttributes, InputHTMLAttributes } from "react"
import { UseFormReturn } from "../useForm"

export type InputAttributes<InputType extends React.HTMLInputTypeAttribute> = (
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
        'required' |
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
