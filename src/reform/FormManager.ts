import { FormEvent } from "react"
import { clone, equal, get, set, SetResult, unset } from "./accessors"
import { DeepPartial, FormConfig } from "./useForm"
import { ValidationForm, ResolvedConstraints, ValidationSettings, Yop } from "../yop/Yop"
import { joinPath, Path } from "../yop/PathUtil"
import { ValidationStatus } from "../yop/ValidationContext"
import { ignored } from "../yop/decorators/ignored"
import { ArrayHelper } from "./ArrayHelper"

export interface ReformValidationSettings extends ValidationSettings {
    method: "validate" | "validateAt" | "constraintsAt"
}

export type SetValueOptions = boolean | {
    touch?: boolean
    validate?: boolean
    propagate?: boolean
}

export interface FormManager extends ValidationForm {

    render(): void

    setSubmitting(submitting: boolean): void
    
    readonly initialValues: unknown
    readonly values: unknown
    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult

    validate(): Map<string, ValidationStatus>
    validateAt(path: string | Path, touchedOnly?: boolean, skipAsync?: boolean): boolean
    updateAsyncStatus(path: string | Path): void

    constraintsAt<MinMax = unknown>(path: string | Path): ResolvedConstraints<MinMax> | undefined

    submit(e: FormEvent<HTMLFormElement>): void

    array<T = any>(path: string): ArrayHelper<T> | undefined
}

const UNSET_VALUES = {}

export class InternalFormManager<T> implements FormManager {
    
    private config: FormConfig<T> = { validationSchema: ignored() }
    private yop = new Yop()
    private pathCache = new Map<string, Path>()

    private _values: unknown = UNSET_VALUES
    private _statuses = new Map<string, ValidationStatus>()
    private touched: object | true | null = null
    private _submitting = false
    private _submitted = false

    htmlForm?: HTMLFormElement

    constructor(readonly render: () => void) {
    }

    get submitted() {
        return this._submitted
    }

    get submitting() {
        return this._submitting
    }

    setSubmitting(submitting: boolean): void {
        this._submitting = submitting
        this.render()
    }

    onRender(config: FormConfig<T>) {
        if (config.validationSchema == null)
            config = { ...config, validationSchema: ignored() }
        this.config = config
    }

    get initialValues(): DeepPartial<T> | null | undefined {
        return this.config.initialValues
    }

    get values(): unknown {
        if (this._values === UNSET_VALUES) {
            this._values = clone(this.config.initialValues)
            this.touched = null
            this._statuses = new Map()
        }
        return this._values
    }

    getValue<V = any>(path: string | Path): V | undefined {
        return get<V>(this.values, path, this.pathCache)
    }

    setValue(path: string | Path, value: unknown, options?: SetValueOptions): SetResult {
        const result = set(this.values, path, value, this.pathCache, { clone: true })
        if (result == null)
            return undefined
        this._values = result.root

        const { touch, validate } = typeof options === "boolean" ? { validate: options, touch: undefined } : options ?? {}
        if (touch === false)
            this.untouch(path)
        else if (validate || touch)
            this.touch(path)

        if (validate) {
            this.validate()
            this.render()
        }

        return result
    }

    isDirty(path?: string | Path) {
        if (path == null || path.length === 0)
            return !equal(this.values, this.config.initialValues)
        return !equal(get(this.values, path, this.pathCache), get(this.config.initialValues, path, this.pathCache))
    }

    isTouched(path: string | Path = []) {
        return get(this.touched, path, this.pathCache) != null
    }

    touch(path: string | Path = []) {
        this.touched = set(this.touched, path, true, this.pathCache, { condition: currentValue => currentValue === undefined })?.root ?? null
    }

    untouch(path: string | Path = []) {
        if (path.length === 0)
            this.touched = null
        else
            unset(this.touched, path, this.pathCache)
    }

    getTouchedValue<T = any>(path: string | Path) {
        return get(this.touched, path, this.pathCache) as T
    }

    setTouchedValue(path: string | Path, value: any) {
        this.touched = set(this.touched, path, value, this.pathCache)?.root ?? null
    }

    get statuses(): Map<string, ValidationStatus> {
        return this._statuses
    }

    validate(touchedOnly = true): Map<string, ValidationStatus> {
        const options: ReformValidationSettings = { method: "validate", form: this }
        if (!this._submitted && touchedOnly)
            options.ignore = path => !this.isTouched(path)
        
        this._statuses = this.yop.rawValidate(this.values, this.config.validationSchema!, options)?.statuses ?? new Map()
        return this._statuses
    }

    validateAt(path: string | Path, touchedOnly = true, skipAsync = true) {
        const change = this._statuses.delete(typeof path === "string" ? path : joinPath(path))
        if (change == null)
            return false
        
        const options: ReformValidationSettings = { method: "validateAt", form: this, path, skipAsync }
        if (!this._submitted && touchedOnly)
            options.ignore = path => !this.isTouched(path)
        
        const statuses = this.yop.rawValidate(this.values, this.config.validationSchema!, options)?.statuses
        statuses?.forEach((status, path) => this._statuses.set(path, status))
        return change || (statuses != null && statuses.size > 0)
    }

    constraintsAt<MinMax = unknown>(path: string | Path): ResolvedConstraints<MinMax> | undefined {
        const settings: ReformValidationSettings = { method: "constraintsAt", form: this, path }
        return this.yop.constraintsAt(this.config.validationSchema!, this.values, settings)
    }

    updateAsyncStatus(path: string | Path) {
        const status = this.yop.getAsyncStatus(path)
        if (status != null)
            this._statuses.set(status.path, status)
        else {
            path = typeof path === "string" ? path : joinPath(path)
            if (this._statuses.get(path)?.level === "pending")
                this._statuses.delete(path)
        }
    }

    submit(e: FormEvent<HTMLFormElement>): void {
        e.preventDefault()
        e.stopPropagation()

        this._submitted = true
        this.setSubmitting(true)

        setTimeout(async () => {
            let statuses = Array.from(this.validate(false).values())
            const pendings = statuses.filter(status => status.level === "pending")
            
            if (pendings.length > 0) {
                this.render()
                const asyncStatuses = (await Promise.all<ValidationStatus | undefined>(pendings.map(status => status.constraint)))
                    .filter(status => status != null)
                if (asyncStatuses.length > 0) {
                    asyncStatuses.forEach(status => this._statuses.set(status.path, status))
                    statuses = Array.from(this._statuses.values())
                }
            }

            const errors = statuses.filter(status => status.level === "error" || (status.level === "unavailable" && status.message))
            if (errors.length === 0)
                (this.config.onSubmit ?? (form => form.setSubmitting(false)))(this)
            else {
                const element = errors
                    .map(status => window.document.getElementById(status.path))
                    .filter(elt => elt !=  null)
                    .sort((elt1, elt2) => elt1.compareDocumentPosition(elt2) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
                    .shift()
                if (element != null) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" })
                    element.focus({ preventScroll: true })
                }
                this.setSubmitting(false)
            }
        })
    }

    array<T = any>(path: string): ArrayHelper<T> | undefined {
        const helper = new ArrayHelper<T>(this, path)
        return helper.isArray() ? helper : undefined
    }
}
