import { FormEvent, useCallback, useRef, useState } from "react"
import { get, set, cloneDeep, toPath, isEqual, unset } from "lodash"
import { useRender } from "./useRender"
import { AsyncValidationError, AsyncValidationResult, AsyncValidationStatus, ObjectSchema, ValidationContext, ValidationError } from "@dsid-opcoatlas/yop"

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
    isTouched: (path?: string) => boolean
    submitted: boolean
    submitting: boolean
    asyncValidating: boolean
    getError: (path: string) => ValidationError | undefined
    getErrorCount: () => number
    getErrorPaths: () => string[]
    isDirty: (path?: string | string[]) => boolean
    hasChanged: (path: string | string[]) => boolean
    hasAsyncResultStatus: (path: string, status: (AsyncValidationStatus | undefined) | (AsyncValidationStatus | undefined)[]) => boolean
    setAsyncResultPending: (path: string, pendingMessage?: string) => void
    getAsyncError: (path: string) => AsyncValidationError | undefined
}

export function reformContext(context: ValidationContext<any>) {
    return context.userContext as ReformContext
}

type ArrayHelper<T = any> = {
    append: (element: T, commit?: boolean) => Promise<boolean>
    replace: (index: number, element: T, commit?: boolean) => Promise<boolean>
    insert: (index: number, element: T, commit?: boolean) => Promise<boolean>
    remove: (index: number, commit?: boolean) => Promise<boolean>
    swap: (index1: number, index2: number, commit?: boolean) => Promise<boolean>
    move: (from: number, to: number, commit?: boolean) => Promise<boolean>
    clear: (commit?: boolean) => Promise<boolean>
}

export type UseFormReturn<T extends object> = {
    formRef: React.MutableRefObject<HTMLFormElement | null>
    formRefCallback: (form: HTMLFormElement | null) => void
    setValue: (path: string, value: any, commit?: boolean, touch?: boolean) => void
    setValues: (values: T) => void
    getValue: (path: string) => any
    array: <T = any>(path: string) => ArrayHelper<T> | undefined
    touch: (path?: string) => boolean
    untouch: (path?: string) => boolean
    reset: (initialValues?: boolean) => void
    resetValidationAt: (path: string, options?: ('touched' | 'async')[]) => void
    resetToInitialValueAt: (path: string) => void
    submit: (e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) => boolean
    setSubmitting: (value: boolean) => void
    values: T | null
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
    const initialValuesRef = useRef<T | null>(null)
    const convertedInitialValuesRef = useRef<T>({} as T)
    const valuesRef = useRef<T>({} as T)
    const valuesSnapshotRef = useRef<T>({} as T)
    const errorsRef = useRef(new Map<string, ValidationError>())
    const asyncResultsRef = useRef(new Map<string, AsyncValidationError>())
    const touchedRef = useRef<object | null>(null)
    const submittedRef = useRef(false)
    const resetDepsRef = useRef<ResetConfiguration>()
    
    const formRefCallback = useCallback((form: HTMLFormElement | null) => {
        formRef.current = form
    }, [])

    const initValues = () => {
        let values = ({} as T)
        if (props.initialValues) {
            values = cloneDeep(props.initialValues)
            if (props.initialValuesConverter)
                values = props.initialValuesConverter(values)
        }
        valuesRef.current = values
        valuesSnapshotRef.current = cloneDeep(valuesRef.current)
        convertedInitialValuesRef.current = valuesSnapshotRef.current
    }

    const reset = (initialValues = true) => {
        errorsRef.current.clear()
        asyncResultsRef.current.clear()
        touchedRef.current = null
        setSubmitting(false)
        setAsyncValidating(false)
        submittedRef.current = false

        if (initialValues)
            initValues()
    }

    if (!isEqual(props.resetConfiguration?.deps, resetDepsRef.current?.deps))
        reset(props.resetConfiguration?.initialValues)
    resetDepsRef.current = props.resetConfiguration

    const isTouched = (path?: string) => {
        if (path == null || path === "")
            return touchedRef.current != null
        return get(touchedRef.current, path) !== undefined
    }

    const touch = (path?: string) => {
        let modified = false
        if (touchedRef.current == null) {
            touchedRef.current = {}
            modified = true
        }
        if (path != null && path !== "" && get(touchedRef.current, path) === undefined) {
            set(touchedRef.current, path, true)
            modified = true
        }
        return modified
    }

    const untouch = (path?: string) => {
        if (touchedRef.current == null)
            return false
        if (path == null || path === "") {
            touchedRef.current = null
            return true
        }
        if (get(touchedRef.current, path) !== undefined) {
            unset(touchedRef.current, path)
            return true
        }
        return false
    }    

    const isDirty = (path?: string | string[]) => {
        const initialValues = convertedInitialValuesRef.current
        if (path == null)
            return !isEqual(initialValues, valuesRef.current)
        
        const paths = Array.isArray(path) ? path : [path]
        return paths.some(path => {
            const initialValue = get(initialValues, path)
            const value = get(valuesRef.current, path)
            return !isEqual(initialValue, value)
        })
    }

    const hasChanged = (path: string | string[]) => {
        const paths = Array.isArray(path) ? path : [path]
        return paths.some(path => {
            const pathSegments = toPath(path)
            return !isEqual(get(valuesSnapshotRef.current, pathSegments), get(valuesRef.current, pathSegments))
        })
    }

    const getError = (path: string): ValidationError | undefined  => {
        return errorsRef.current.get(path)
    }

    const getErrorCount = (): number => {
        return errorsRef.current.size
    }

    const getErrorPaths = (): string[] => {
        return Array.from(errorsRef.current.keys())
    }

    const getAsyncError = (path: string): AsyncValidationError | undefined  => {
        return asyncResultsRef.current.get(path)
    }

    const setAsyncResultPending = (path: string, pendingMessage?: string) => {
        const result = {
            ...(
                asyncResultsRef.current.get(path) ??
                {
                    code: "asyncTest",
                    value: get(valuesRef.current, path),
                    path: path,
                }
            ),
            message: pendingMessage ?? "Validation pending...",
            status: "pending" as AsyncValidationStatus,
        }
        asyncResultsRef.current.set(path, result)
        errorsRef.current.set(path, result)
        setAsyncValidating(true)
    }

    const hasAsyncResultStatus = (path: string, status: (AsyncValidationStatus | undefined) | (AsyncValidationStatus | undefined)[]) => {
        const error = asyncResultsRef.current.get(path)
        const statuses = Array.isArray(status) ? status : [status]
        return statuses.includes(error?.status)
    }

    const reformUserContext = (submitting = false): ReformContext => {
        return {
            isTouched,
            submitted: submittedRef.current,
            submitting,
            asyncValidating,
            getError,
            getErrorCount,
            getErrorPaths,
            isDirty,
            hasChanged,
            hasAsyncResultStatus,
            setAsyncResultPending,
            getAsyncError,
        }
    }

    const validate = (touchedOnly = true, submitting = false) => {
        errorsRef.current.clear()
        asyncResultsRef.current.forEach(error => {
            if (error.path && (error.status === 'invalid' || error.status === 'unavailable'))
                errorsRef.current.set(error.path, error)
        })

        if (props.validationSchema == null)
            return Promise.resolve(true)

        const result = props.validationSchema.validateAsync(valuesRef.current, reformUserContext(submitting))
        
        result.errors.forEach((error) => {
            if (error.path && (submittedRef.current || !touchedOnly || isTouched(error.path)))
                errorsRef.current.set(error.path, error)
        })

        return Promise.all(result.promises).then(results => results.flat())
            .then(results => {
                results.forEach((result) => {
                    if (result.path) {
                        if (result.status !== 'skipped' || asyncResultsRef.current.get(result.path) == null)
                            asyncResultsRef.current.set(result.path, result)
                        if (result.status === 'invalid' || result.status === 'unavailable')
                            errorsRef.current.set(result.path, result as ValidationError)
                    }
                })
                return errorsRef.current.size === 0
            })
            .finally(() => {
                valuesSnapshotRef.current = cloneDeep(valuesRef.current)
                setAsyncValidating(false)
            })
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

    const resetValidationAt = (path: string, options: ('touched' | 'async')[] = ['touched']) => {
        const pathSegments = toPath(path)
        clearPath(pathSegments, errorsRef.current)
        if (options.includes('touched') && touchedRef.current != null)
            untouch(path)
        if (options.includes('async'))
            clearPath(pathSegments, asyncResultsRef.current)
    }

    const resetToInitialValueAt = (path: string) => {
        set(valuesRef.current, path, get(convertedInitialValuesRef.current, path))
    }

    const submit = (e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) => {
        e.preventDefault()
        e.stopPropagation()

        submittedRef.current = true
        setSubmitting(true)
        setTimeout(() => {
            validate(false, true).then(valid => {
                if (valid)
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
        })

        return false
    }

    // const setValue2 = (path: string, value: any, commit: boolean | { validate: boolean, touch: boolean } = false) => {
    //     const options = {
    //         validate: typeof commit === 'boolean' ? commit : commit.validate,
    //         touch: typeof commit === 'boolean' ? commit : commit.touch
    //     }
    //     // if (path === '')
    //     //     return setValues(value, commit)
        
    //     let promise = null
        
    //     set(valuesRef.current, path, value)
    //     if (options.touch || getError(path) !== undefined)
    //         touch(path)
    //     else if (!options.touch)
    //         untouch(path)
        
    //     if (options.validate) {
    //         promise = validate()
    //         renderForm()
    //     }
        
    //     return promise ?? Promise.resolve(true)
    // }

    // setValue2("person.friend", null, { validate: true, touch: false })

    const setValue = (path: string, value: any, commit = false, onlyTouch = false) => {
        if (path === '')
            return setValues(value, commit)
        
        let promise = null
        
        set(valuesRef.current, path, value)
        if (commit || onlyTouch || getError(path) !== undefined)
            touch(path)
        if (commit) {
            promise = validate()
            renderForm()
        }
        
        return promise ?? Promise.resolve(true)
    }

    const setValues = (values: T, commit = true) => {
        let promise = null
        
        valuesRef.current = cloneDeep(values)
        if (commit) {
            promise = validate()
            renderForm()
        }
        
        return promise ?? Promise.resolve(true)
    }

    const getValue = (path: string) => {
        return get(valuesRef.current, path)
    }

    const array = <T = any>(path: string) => {
        const value = get(valuesRef.current, path)
        if (value == null || !Array.isArray(value))
            return undefined

        return {
            append: (element: T, commit = true) => {
                let promise = null
                
                value.push(element)
                touch(path)
                if (commit) {
                    promise = validate()
                    renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },

            replace: (index: number, element: T, commit = true) => {
                let promise = null
                
                value[index] = element
                if (!untouch(`${ path }[${ index }]`))
                    touch(path)
                if (commit) {
                    promise = validate()
                    renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },

            insert: (index: number, element: T, commit = true) => {
                let promise = null
                
                value.splice(index, 0, element)
                if (!isTouched(path))
                    touch(path)
                else
                    get(touchedRef.current!, path)?.splice?.(index, 0, undefined)
                if (commit) {
                    promise = validate()
                    renderForm()
                }

                return promise ?? Promise.resolve(true)
            },

            remove: (index: number, commit = true) => {
                let promise = null
                
                value.splice(index, 1)
                if (!isTouched(path))
                    touch(path)
                else
                    get(touchedRef.current!, path)?.splice?.(index, 1)
                if (commit) {
                    promise = validate()
                    renderForm()
                }

                return promise ?? Promise.resolve(true)
            },

            swap: (index1: number, index2: number, commit = true) => {
                let promise = null
                
                const action = <T>(array: T[]) => {
                    const value1 = array[index1]
                    array[index1] = array[index2]
                    array[index2] = value1
                }

                action(value)
                if (!isTouched(path))
                    touch(path)
                else {
                    const array = get(touchedRef.current!, path)!
                    if (Array.isArray(array))
                        action(array)
                }
                if (commit) {
                    promise = validate()
                    renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },

            move: (from: number, to: number, commit = true) => {
                let promise = null

                if (from !== to) {
                    const action = from < to ?
                        <T>(array: T[]) => {
                            const fromElement = array[from]
                            for (let i = from; i < to; i++)
                                array[i] = array[i + 1]
                            array[to] = fromElement
                        } :
                        <T>(array: T[]) => {
                            const toElement = array[to]
                            for (let i = to; i > from; i--)
                                array[i + 1] = array[i]
                            array[from] = toElement
                        }
                    
                    action(value)
                    if (!isTouched(path))
                        touch(path)
                    else {
                        const array = get(touchedRef.current!, path)!
                        if (Array.isArray(array))
                            action(array)
                    }
                    if (commit) {
                        promise = validate()
                        renderForm()
                    }
                }
                
                return promise ?? Promise.resolve(true)
            },

            clear: (commit = true) => {
                let promise = null
                
                value.splice(0, value.length)
                untouch(path)
                touch(path)
                if (commit) {
                    promise = validate()
                    renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },
        }
    }

    if (!isTouched() && !isEqual(props.initialValues ?? null, initialValuesRef.current)) {
        initialValuesRef.current = props.initialValues ?? null
        initValues()
    }

    return {
        formRef,
        formRefCallback,
        setValue,
        setValues,
        getValue,
        touch,
        untouch,
        reset,
        resetValidationAt,
        resetToInitialValueAt,
        submit,
        submitted: submittedRef.current,
        submitting,
        asyncValidating,
        setSubmitting,
        values: valuesRef.current,
        getError,
        getErrorCount,
        getErrorPaths,
        isTouched,
        isDirty,
        hasChanged,
        hasAsyncResultStatus,
        setAsyncResultPending,
        getAsyncError,
        validateAt,
        renderForm,
        array,
        ...props
    }
}
