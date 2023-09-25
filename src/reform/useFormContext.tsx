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

export function Form<T extends object>(props: FormProps<T>) {
    const { context, children, ...formAttrs } = props

    return (
        <FormContext.Provider value={ context }>
            <form ref={ context.formRefCallback } onSubmit={ (e) => context.submit(e, context) } { ...formAttrs }>
                <fieldset disabled={ props.disabled }>{ children }</fieldset>
                
                { context.getErrorCount() > 0 && process.env.NODE_ENV === 'development' &&
                <div style={{
                    all: "initial",
                    display: "block",
                    marginTop: "1em",
                    padding: "1em",
                    fontFamily: "monospace",
                    border: "2px solid firebrick",
                    color: "firebrick",
                    background: "white",
                    whiteSpace: "pre"
                }}>
                    Validation errors: { JSON.stringify(Object.fromEntries(context.getErrorPaths().map(path => ([ path, context.getError(path) ]))), null, 4) }
                </div>
                }
            </form>
        </FormContext.Provider>
    )
}
