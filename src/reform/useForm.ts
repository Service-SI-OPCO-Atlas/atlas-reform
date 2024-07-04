import { FormEvent, useCallback, useRef, useState } from "react"
import { useRender } from "./useRender"
import { AsyncValidationError, AsyncValidationStatus, ObjectSchema, ValidationContext, ValidationError } from "@dsid-opcoatlas/yop"
import React from "react"
import { ArrayHelper, FormManager, SetValueOptions } from "./FormManager"

export type ResetConfiguration = {
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
    isTouched: (path?: string) => boolean
    touch: (path?: string) => boolean
    untouch: (path?: string) => boolean
    submitted: boolean
    submitting: boolean
    asyncValidating: boolean
    getError: (path: string) => ValidationError | undefined
    getErrorCount: () => number
    getErrorPaths: () => string[]
    isDirty: (path?: string | string[]) => boolean
    hasChanged: (path: string | string[]) => boolean
    isAsyncResultPending: (path: string) => boolean
    hasAsyncResultStatus: (path: string, status: (AsyncValidationStatus | undefined) | (AsyncValidationStatus | undefined)[]) => boolean
    setAsyncResultPending: (path: string, pendingMessage?: string) => void
    getAsyncError: (path: string) => AsyncValidationError | undefined
}

export function reformContext<T>(context: ValidationContext<T>) {
    return context.userContext as ReformContext
}

export type FormManagerContext<T extends object> = {
    setValue: (path: string, value: any, commit?: boolean | SetValueOptions) => Promise<boolean>
    setValues: (values: T, commit?: boolean | SetValueOptions) => Promise<boolean>
    getValue: (path: string) => any
    array: <T = any>(path: string) => ArrayHelper<T> | undefined
    touch: (path?: string) => boolean
    untouch: (path?: string) => boolean
    reset: (initialValues?: boolean) => void
    resetToInitialValueAt: (path: string) => void
    submit: (e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) => boolean
    setSubmitting: (value: boolean) => void
    values: T | null
    validate: (touchedOnly?: boolean) => Promise<boolean>
    validateAt: (path: string, touchedOnly?: boolean) => boolean
    renderForm: () => void
} & UseFormProps<T> & ReformContext

export type UseFormReturn<T extends object> = FormManagerContext<T> & {
    formRef: React.MutableRefObject<HTMLFormElement | null>
    formRefCallback: (form: HTMLFormElement | null) => void
}

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
        error: context.getError(path)?.message,
        constraints: constraints
    }
}

export function useForm<T extends object>(props: UseFormProps<T>): UseFormReturn<T> {

    const [submitting, setSubmitting] = useState(false)
    const [asyncValidating, setAsyncValidating] = useState(false)

    const renderForm = useRender()

    const formRef = useRef<HTMLFormElement | null>(null)
    const formRefCallback = useCallback((form: HTMLFormElement | null) => {
        formRef.current = form
    }, [])
    
    const formState = { props, submitting, asyncValidating }
    const formManagerRef = useRef<FormManager<T> | null>(null)
    
    if (formManagerRef.current == null) {
        formManagerRef.current = new FormManager<T>(
            formState,
            setSubmitting,
            setAsyncValidating,
            renderForm,
        )
    }

    formManagerRef.current.onRender(formState)

    return {
        ...formManagerRef.current.formContext(),
        formRef,
        formRefCallback,
    }
}
