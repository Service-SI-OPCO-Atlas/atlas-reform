import React, { FormHTMLAttributes } from "react"
import { UseFormReturn } from "./useForm"

const FormContext = React.createContext<UseFormReturn<any> | null>(null)

export function useFormContext<T extends object>(): UseFormReturn<T> {
    return React.useContext(FormContext) as unknown as UseFormReturn<T>
}

interface FormProps<T extends object> extends Omit<FormHTMLAttributes<HTMLFormElement>, "ref" | "onSubmit"> {
    context: UseFormReturn<T>
    disabled?: boolean
}

export default function Form<T extends object>(props: FormProps<T>) {
    const { context, children, ...formAttrs } = props

    return (
        <FormContext.Provider value={ context }>
            <form ref={ context.formRefCallback } onSubmit={ (e) => context.submit(e, context) } { ...formAttrs }>
                <fieldset disabled={ props.disabled }>{ children }</fieldset>
                
                { context.errors.size > 0 && process.env.NODE_ENV === 'development' &&
                <div className="m-formError" style={{ marginTop: "1em" }}>
                    <pre className="m-formError__title">Validation errors: { JSON.stringify(Object.fromEntries(context.errors), null, 4) }</pre>
                </div>
                }
            </form>
        </FormContext.Provider>
    )
}
