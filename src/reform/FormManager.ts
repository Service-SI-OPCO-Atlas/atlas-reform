import { cloneDeep, get, isEqual, toPath } from "lodash-es"
import { AsyncResultsHolder } from "./holders/AsyncResultsHolder"
import { ErrorsHolder } from "./holders/ErrorsHolder"
import { TouchedHolder } from "./holders/TouchedHolder"
import { ValuesHolder } from "./holders/ValuesHolder"
import { FormManagerContext, ReformContext, UseFormProps, UseFormReturn } from "./useForm"
import { AsyncValidationStatus, ValidationError } from "@dsid-opcoatlas/yop"
import { FormEvent } from "react"

export enum SetValueOptions {
    Touch = 0x0001,
    Untouch = 0x0010,
    Validate = 0x0100,
    Silent = 0x1000,
}

const getSetValueOptions = (commit: boolean | SetValueOptions) => ({
    touch: commit === true || (typeof commit === "number" && (commit & SetValueOptions.Touch) !== 0),
    untouch: (typeof commit === "number" && (commit & SetValueOptions.Untouch) !== 0),
    validate: commit === true || (typeof commit === "number" && (commit & SetValueOptions.Validate) !== 0),
    silent: (typeof commit === "number" && (commit & SetValueOptions.Silent) !== 0),
})

export type ArrayHelper<T = any> = {
    append: (element: T, commit?: boolean) => Promise<boolean>
    replace: (index: number, element: T, commit?: boolean) => Promise<boolean>
    insert: (index: number, element: T, commit?: boolean) => Promise<boolean>
    remove: (index: number, commit?: boolean) => Promise<boolean>
    swap: (index1: number, index2: number, commit?: boolean) => Promise<boolean>
    move: (from: number, to: number, commit?: boolean) => Promise<boolean>
    clear: (commit?: boolean) => Promise<boolean>
}

export type FormState<T extends object> = {
    submitting: boolean
    asyncValidating: boolean
    props: UseFormProps<T>
}

export interface ReformSetValueEvent<T = any> extends CustomEvent<{
    readonly form: FormManagerContext<any>,
    readonly path: string,
    readonly previousValue: T,
    readonly value: T,
    readonly options: ReturnType<typeof getSetValueOptions>
}> {
}

const ReformSetValueEventType = 'reform:set-value'

function createReformSetValueEvent<T = any>(
    form: FormManagerContext<any>,
    path: string,
    previousValue: T,
    value: T,
    options: ReturnType<typeof getSetValueOptions>
): ReformSetValueEvent<T> {
    return new CustomEvent(ReformSetValueEventType, { detail: {form, path, previousValue, value, options }})
}

const defaultIsDepsEqual = (previousDeps: React.DependencyList, deps: React.DependencyList): boolean => {
    if (previousDeps.length !== deps.length)
        return false
    for (let i = 0; i < deps.length; i++) {
        if (previousDeps[i] !== deps[i])
            return false
    }
    return true
}

export class FormManager<T extends object> {

    private formState: FormState<T>
    private setSubmitting: (value: boolean) => void
    private setAsyncValidating: (value: boolean) => void
    private renderForm: () => void

    private initialValues: T | null = null
    private convertedInitialValues = {} as T
    private valuesSnapshot = {} as T
    private submitted = false
    private resetDeps: React.DependencyList | undefined = undefined

    private touched = new TouchedHolder<T>(this)
    private errors = new ErrorsHolder<T>(this)
    private values = new ValuesHolder<T>(this)
    private asyncResults = new AsyncResultsHolder<T>(this)

    private eventTarget = new EventTarget()

    constructor(
        formState: FormState<T>,
        setSubmitting: (value: boolean) => void,
        setAsyncValidating: (value: boolean) => void,
        renderForm: () => void,
    ) {
        this.formState = formState
        this.setSubmitting = setSubmitting
        this.setAsyncValidating = setAsyncValidating
        this.renderForm = renderForm
    }

    private initValues(initialValues?: T | null | undefined) {
        let values = ({} as T)
        if (initialValues != null || this.formState.props.initialValues != null) {
            values = cloneDeep(initialValues ?? this.formState.props.initialValues!)
            if (this.formState.props.initialValuesConverter)
                values = this.formState.props.initialValuesConverter(values)
        }
        this.values.set(values)
        this.valuesSnapshot = this.convertedInitialValues = this.values.clone()
    }

    onRender(formState: FormState<T>) {
        this.formState = formState

        const props = this.formState.props
        
        if (props.resetConfiguration != null) {
            if (this.resetDeps != null) {
                const isDepsEqual = props.resetConfiguration.isEqual ?? defaultIsDepsEqual
                if (!isDepsEqual(this.resetDeps, props.resetConfiguration.deps))
                    this.reset(props.resetConfiguration.resetInitialValues)
            }
            this.resetDeps = props.resetConfiguration.deps
        }

        if (!this.touched.isTouched() && !isEqual(props.initialValues ?? null, this.initialValues)) {
            this.initialValues = props.initialValues ?? null
            this.initValues()
        }
    }

    reset(initialValues = true) {
        this.touched.reset()
        this.errors.reset()
        this.asyncResults.reset()

        this.setSubmitting(false)
        this.setAsyncValidating(false)
        this.submitted = false

        if (initialValues)
            this.initValues()
    }
    
    isDirty(path?: string | string[]) {
        if (path == null)
            return !this.values.equals(this.convertedInitialValues)
        
        const paths = Array.isArray(path) ? path : [path]
        return paths.some(path => {
            const initialValue = get(this.convertedInitialValues, path)
            const value = this.values.getAt(path)
            return !isEqual(initialValue, value)
        })
    }

    hasChanged(path: string | string[]) {
        const paths = Array.isArray(path) ? path : [path]
        return paths.some(path => {
            const pathSegments = toPath(path)
            return !isEqual(get(this.valuesSnapshot, pathSegments), this.values.getAt(pathSegments))
        })
    }

    resetValues(initialValues: T) {
        this.initValues(initialValues)
    }

    resetToInitialValueAt(path: string) {
        this.values.setAt(path, get(this.convertedInitialValues, path))
    }

    clearErrorsAt(path: string, asyncResults = true) {
        this.errors.delete(path)
        if (asyncResults)
            this.asyncResults.delete(path)
    }

    private validate(touchedOnly = true) {
        this.errors.reset()
        this.asyncResults.resetChanged(this.values)
        this.asyncResults.values().forEach(error => {
            if (error.path && ["invalid", "pending"].includes(error.status) && this.touched.isTouched(error.path))
                this.errors.set(error.path, error)
        }, this)

        if (this.formState.props.validationSchema == null)
            return Promise.resolve(true)

        const result = this.formState.props.validationSchema.validateAsync(this.values.get(), this.userContext())
        
        result.errors.forEach((error) => {
            if (error.path && (this.submitted || !touchedOnly || this.touched.isTouched(error.path)))
                this.errors.set(error.path, error)
        }, this)
        
        const _this = this
        return Promise.all(result.promises)
            .then(results => results.flat())
            .then(results => {
                results.forEach((result) => {
                    if (result.path) {
                        if (result.status !== 'skipped' || _this.asyncResults.get(result.path) == null)
                            _this.asyncResults.set(result.path, result)
                        
                        if (result.status === 'valid' || result.status === 'unavailable')
                            _this.errors.delete(result.path)
                        else if (result.status === 'invalid')
                            _this.errors.set(result.path, result as ValidationError)
                        
                        _this.renderForm()
                    }
                }, _this)
                return _this.errors.size() === 0
            })
            .finally(() => {
                _this.valuesSnapshot = _this.values.clone()
                _this.setAsyncValidating(false)
            })
    }

    validateAt(path: string, touchedOnly = true) {
        if (touchedOnly && !this.touched.isTouched(path))
            return false
        
        const change = this.errors.delete(path)
        
        const currentErrors = this.formState.props.validationSchema?.validateAt(path, this.values.get(), this.userContext()) ?? []
        currentErrors.forEach((error) => {
            if (error.path && (!touchedOnly || this.touched.isTouched(error.path)))
                this.errors.set(error.path, error)
        }, this)

        return change || currentErrors.length > 0
    }

    setValue(path: string, value: any, commit: boolean | SetValueOptions = false) {
        if (path === '')
            return this.setValues(value, commit)

        const options = getSetValueOptions(commit)
        
        let promise: Promise<boolean> | null = null
        
        const previousValue = this.values.getAt(path)
        this.values.setAt(path, value)

        if (options.untouch)
            this.touched.untouch(path)
        else if (options.touch || this.errors.get(path) !== undefined)
            this.touched.touch(path)
        
        if (options.validate) {
            promise = this.validate()
            this.renderForm()
        }

        if (this.formState.props.dispatchEvent !== false && options.silent === false) {
            setTimeout(() => {
                this.eventTarget.dispatchEvent(createReformSetValueEvent(this.formContext(), path, previousValue, value, options))
            })
        }
        
        return promise ?? Promise.resolve(true)
    }

    setValues(values: T, commit: boolean | SetValueOptions = true) {
        let promise: Promise<boolean> | null = null
        
        const options = getSetValueOptions(commit)
        
        if (options.untouch)
            this.touched.untouch()
        else if (options.touch || this.errors.get("") !== undefined)
            this.touched.touch()
        
        this.values.set(cloneDeep(values))
        if (options.validate) {
            promise = this.validate()
            this.renderForm()
        }
        
        return promise ?? Promise.resolve(true)
    }

    setAsyncResultPending(path: string, pendingMessage?: string) {
        const result = {
            ...(
                this.asyncResults.get(path) ??
                {
                    code: "asyncTest",
                    value: this.values.getAt(path),
                    path: path,
                }
            ),
            message: pendingMessage ?? "Validation pending...",
            status: "pending" as AsyncValidationStatus,
        }
        this.asyncResults.set(path, result);
        this.errors.set(path, result);
        this.setAsyncValidating(true);
    }


    submit(e: FormEvent<HTMLFormElement>, context: UseFormReturn<T>) {
        e.preventDefault()
        e.stopPropagation()

        this.submitted = true
        this.setSubmitting(true)

        const _this = this
        setTimeout(() => {
            _this.validate(false).then(valid => {
                if (valid)
                    _this.formState.props.onSubmit?.(context)
                else {
                    console.error("Validation errors", _this.errors.values())
                    const firstErrorKey = _this.errors.paths()?.[0]
                    const element = window.document.getElementById(firstErrorKey)
                    if (element) {
                        setTimeout(() => {
                            element.focus()
                            element.scrollIntoView({ block: 'center' })
                        }, 250)
                    }
                    _this.setSubmitting(false)
                }
            })
        })

        return false
    }

    array<T = any>(path: string): ArrayHelper<T> | undefined {
        const value = this.values.getAt(path)
        if (value == null || !Array.isArray(value))
            return undefined

        return {
            append: (element: T, commit = true) => {
                let promise = null
                
                value.push(element)
                this.touched.touch(path)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },

            replace: (index: number, element: T, commit = true) => {
                let promise = null
                
                value[index] = element
                if (!this.touched.untouch(`${ path }[${ index }]`))
                    this.touched.touch(path)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },

            insert: (index: number, element: T, commit = true) => {
                let promise = null
                
                value.splice(index, 0, element)
                if (!this.touched.isTouched(path))
                    this.touched.touch(path)
                else
                    this.touched.get<any[]>(path)?.splice?.(index, 0, undefined)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
                }

                return promise ?? Promise.resolve(true)
            },

            remove: (index: number, commit = true) => {
                let promise = null
                
                value.splice(index, 1)
                if (!this.touched.isTouched(path))
                    this.touched.touch(path)
                else
                    this.touched.get<any[]>(path)?.splice?.(index, 1)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
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
                if (!this.touched.isTouched(path))
                    this.touched.touch(path)
                else
                    action(this.touched.get<any[]>(path)!)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
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
                    if (!this.touched.isTouched(path))
                        this.touched.touch(path)
                    else
                        action(this.touched.get<any[]>(path)!)
                    if (commit) {
                        promise = this.validate()
                        this.renderForm()
                    }
                }
                
                return promise ?? Promise.resolve(true)
            },

            clear: (commit = true) => {
                let promise = null
                
                value.splice(0, value.length)
                this.touched.untouch(path)
                this.touched.touch(path)
                if (commit) {
                    promise = this.validate()
                    this.renderForm()
                }
                
                return promise ?? Promise.resolve(true)
            },
        }
    }
    
    userContext(): ReformContext {
        return {
            ...this.touched.userContext(),
            ...this.errors.userContext(),
            ...this.values.userContext(),
            ...this.asyncResults.userContext(),
            
            submitted: this.submitted,
            submitting: this.formState.submitting,
            asyncValidating: this.formState.asyncValidating,
            isDirty: this.isDirty.bind(this),
            hasChanged: this.hasChanged.bind(this),
            setAsyncResultPending: this.setAsyncResultPending.bind(this),
        }
    }

    addReformEventListener(listener: EventListener) {
        this.eventTarget.addEventListener(ReformSetValueEventType, listener)
    }

    removeReformEventListener(listener: EventListener) {
        this.eventTarget.removeEventListener(ReformSetValueEventType, listener)
    }

    formContext(): FormManagerContext<T> {
        return {
            ...this.touched.formContext(),
            ...this.errors.formContext(),
            ...this.values.formContext(),
            ...this.asyncResults.formContext(),

            submitted: this.submitted,
            submitting: this.formState.submitting,
            setSubmitting: this.setSubmitting.bind(this),
            asyncValidating: this.formState.asyncValidating,
            values: this.values.get(),
            reset: this.reset.bind(this),
            resetValues: this.resetValues.bind(this),
            renderForm: this.renderForm.bind(this),
            isDirty : this.isDirty.bind(this),
            hasChanged: this.hasChanged.bind(this),
            resetToInitialValueAt: this.resetToInitialValueAt.bind(this),
            clearErrorsAt: this.clearErrorsAt.bind(this),
            array: this.array.bind(this),
            validate: this.validate.bind(this),
            validateAt: this.validateAt.bind(this),
            setValue: this.setValue.bind(this),
            setValues: this.setValues.bind(this),
            submit: this.submit.bind(this),
            setAsyncResultPending: this.setAsyncResultPending.bind(this),
            addReformEventListener: this.addReformEventListener.bind(this),
            removeReformEventListener: this.removeReformEventListener.bind(this),
        
            ...this.formState.props
        }
    }
}
