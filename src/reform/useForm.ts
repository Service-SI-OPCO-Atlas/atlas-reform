import { FormEvent, useCallback, useRef, useState } from "react"
import { get, set, cloneDeep, toPath, isEqual } from "lodash"
import { useRender } from "./useRender"
import { ObjectSchema, ValidationError } from "@dsid-opcoatlas/yop"

type ResetConfiguration = {
    initialValues?: boolean
    deps?: React.DependencyList
}

export type UseFormProps<T extends object> = {
    initialValues?: T | null
    initialValuesConverter?: (values: T) => T
    validationSchema?: ObjectSchema<Partial<T | null | undefined>>
    onSubmit?: (context: UseFormReturn<T>) => void
    resetConfiguration?: ResetConfiguration
}

export type ReformContext = {
    isTouched: (path: string) => boolean
    submitted: boolean
    submitting: boolean
    getError: (path: string) => ValidationError | undefined
    isDirty: (path?: string) => boolean
}

export type UseFormReturn<T extends object> = {
    formRef: React.MutableRefObject<HTMLFormElement | null>
    formRefCallback: (form: HTMLFormElement | null) => void
    setValue: (path: string, value: any, commit?: boolean, touch?: boolean) => void
    getValue: (path: string) => any
    reset: (initialValues?: boolean) => void
    resetValidationAt: (path: string) => void
    resetToInitialValueAt: (path: string) => void
    submit: (e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) => boolean
    setSubmitting: (value: boolean) => void
    values: T | null
    errors: Map<string, ValidationError>
    touched: Set<string>
    validateAt: (path: string, touchedOnly?: boolean) => boolean
    renderForm: () => void
} & UseFormProps<T> & ReformContext

export type FieldConstraints = {
    required: boolean
    min?: number | Date | string
    max?: number | Date | string
}

export type FieldState<T> = {
    value: T
    touched: boolean
    error?: string
    constraints: FieldConstraints
}

const arrayStartsWith = (array: string[], start: string[]) => {
    if (array.length < start.length)
        return false
    for (let i = 0; i < start.length; i++) {
        if (array[i] !== start[i])
            return false
    }
    return true
}

const clearPath = (path: string[], collection: Map<string, any> | Set<string>) => {
    collection.forEach((_, key) => {
        if (arrayStartsWith(toPath(key), path))
            collection.delete(key)
    })
}

const includesPath = (path: string[], collection: Set<string>) => {
    const array = Array.from(collection)
    for (let value of array) {
        if (arrayStartsWith(toPath(value), path))
            return true
    }
    return false
}

export function getFieldState<S>(context: UseFormReturn<any>, path: string): FieldState<S> {
    const constraints: FieldConstraints = { required: false }
    
    if (context.validationSchema) {
        const schema = context.validationSchema.schemaAt(path, context.values)
        if (schema) {
            constraints.required = !schema.constraints.nullable.value && !schema.constraints.optional.value
            constraints.min = schema.constraints.min?.value as (number | Date)
            constraints.max = schema.constraints.max?.value as (number | Date)
        }
    }

    return {
        value: context.getValue(path),
        touched: context.isTouched(path),
        error: context.errors.get(path)?.message,
        constraints: constraints
    }
}

export function useForm<T extends object>(props: UseFormProps<T>): UseFormReturn<T> {

    const renderForm = useRender()

    const formRef = useRef<HTMLFormElement | null>(null)
    const initialValuesRef = useRef<T | null>(null)    
    const valuesRef = useRef<T>({} as T)
    const errorsRef = useRef(new Map<string, ValidationError>())
    const touchedRef = useRef(new Set<string>())
    const submittedRef = useRef(false)
    const [submitting, setSubmitting] = useState(false)
    const resetDepsRef = useRef<ResetConfiguration>()

    const cloneInitialValues = () => {
        let values = ({} as T)
        if (props.initialValues) {
            values = cloneDeep(props.initialValues)
            if (props.initialValuesConverter)
                values = props.initialValuesConverter(values)
        }
        return values
    }

    const reset = (initialValues = true) => {
        errorsRef.current.clear()
        touchedRef.current.clear()
        setSubmitting(false)
        submittedRef.current = false

        if (initialValues)
            valuesRef.current = cloneInitialValues()
    }

    if (!isEqual(props.resetConfiguration?.deps, resetDepsRef.current?.deps))
        reset(props.resetConfiguration?.initialValues)
    resetDepsRef.current = props.resetConfiguration

    
    const formRefCallback = useCallback((form: HTMLFormElement | null) => {
        formRef.current = form
    }, [])

    const isTouched = (path: string) => {
        return touchedRef.current.has(path) || includesPath(toPath(path), touchedRef.current)
    }

    const isDirty = (path?: string) => {
        let initialValues = cloneInitialValues()
        let values = valuesRef.current
        if (path != null) {
            initialValues = get(initialValues, path)
            values = get(values, path)
        }
        return !isEqual(initialValues, values)
    }

    const getError = (path: string): ValidationError | undefined  => {
        return errorsRef.current.get(path)
    }

    const reformUserContext = (): ReformContext => {
        return {
            isTouched,
            submitted: submittedRef.current,
            submitting,
            getError,
            isDirty
        }
    }

    const validate = (touchedOnly = true) => {
        errorsRef.current.clear()
        
        const errors = props.validationSchema?.validate(valuesRef.current, reformUserContext()) ?? []
        errors.forEach((error) => {
            if (error.path && (submittedRef.current || !touchedOnly || isTouched(error.path)))
                errorsRef.current.set(error.path, error)
        })
        return errorsRef.current.size === 0
    }

    const validateAt = (path: string, touchedOnly = true) => {
        if (touchedOnly && !isTouched(path))
            return false
        
        const change = errorsRef.current.delete(path)
        
        const errors = props.validationSchema?.validateAt(path, valuesRef.current, reformUserContext()) ?? []
        errors.forEach((error) => {
            if (error.path && (!touchedOnly || isTouched(error.path)))
                errorsRef.current.set(error.path, error)
        })

        return change || errors.length > 0
    }

    const resetValidationAt = (path: string) => {
        const pathSegments = toPath(path)
        clearPath(pathSegments, errorsRef.current)
        clearPath(pathSegments, touchedRef.current)
    }

    const resetToInitialValueAt = (path: string) => {
        set(valuesRef.current, path, get(cloneInitialValues(), path))
    }

    const submit = (e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) => {
        e.preventDefault()
        e.stopPropagation()

        submittedRef.current = true
        setSubmitting(true)
        setTimeout(() => {
            if (validate(false))
                props.onSubmit?.(context)
            else {
                const firstErrorKey = errorsRef.current.keys().next().value
                const element = window.document.getElementById(firstErrorKey)
                if (element) {
                    setTimeout(() => {
                        element.focus()
                        element.scrollIntoView({ block: 'center' })
                    }, 250)
                }
                setSubmitting(false)
            }
        })

        return false
    }

    const setValue = (path: string, value: any, commit = false, touch = false) => {
        set(valuesRef.current, path, value)
        if (commit || touch || getError(path) !== undefined)
            touchedRef.current.add(path)
        if (commit) {
            validate()
            renderForm()
        }
    }

    const getValue = (path: string) => {
        return get(valuesRef.current, path)
    }

    if (!isEqual(props.initialValues ?? null, initialValuesRef.current)) {
        initialValuesRef.current = props.initialValues ?? null
        if (touchedRef.current.size === 0)
            valuesRef.current = cloneInitialValues()
    }

    return {
        formRef,
        formRefCallback,
        setValue,
        getValue,
        reset,
        resetValidationAt,
        resetToInitialValueAt,
        submit,
        submitted: submittedRef.current,
        submitting,
        setSubmitting,
        values: valuesRef.current,
        errors: errorsRef.current,
        getError,
        touched: touchedRef.current,
        isTouched,
        isDirty,
        validateAt,
        renderForm,
        ...props
    }
}
