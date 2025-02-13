import React from "react"
import { FormManager } from "./FormManager"

export const FormContext = React.createContext<FormManager | null>(null)

export function useFormContext() {
    return React.useContext(FormContext)!
}
