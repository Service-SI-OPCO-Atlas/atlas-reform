import { useRef } from "react"
import { useRender } from "./useRender"
import { FormManager, InternalFormManager } from "./FormManager"

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

export type FormConfig<T> = {
    readonly initialValues?: DeepPartial<T> | null
    readonly validationSchema?: ((_: unknown, context: ClassFieldDecoratorContext<unknown, T>) => void)
    readonly onSubmit?: (form: FormManager) => void
    readonly dispatchEvent?: boolean
}

export function useForm<T>(config: FormConfig<T>): FormManager {
    const render = useRender()
    const managerRef = useRef<InternalFormManager<T>>(new InternalFormManager<T>(render))
    managerRef.current.onRender(config)
    return managerRef.current
}